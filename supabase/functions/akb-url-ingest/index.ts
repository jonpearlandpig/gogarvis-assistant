import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body = {
  url: string;
  workspace_id?: string | null;
  create_draft?: boolean;
};

function normalizeUrl(input: string) {
  const u = new URL(input.trim());
  u.hash = "";
  return u.toString();
}

function isAllowedUrl(url: string) {
  const u = new URL(url);
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.startsWith("127.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host === "0.0.0.0"
  )
    return false;
  return true;
}

function stripHtmlToText(html: string) {
  html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ");
  html = html.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ");
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") : null;
  const text = html
    .replace(/<\/(p|div|br|li|h\d|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return { title, text };
}

function wordCount(s: string) {
  const m = s.trim().match(/\S+/g);
  return m ? m.length : 0;
}

async function sha256Hex(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.url) {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let normalized: string;
    try {
      normalized = normalizeUrl(body.url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAllowedUrl(normalized)) {
      return new Response(
        JSON.stringify({
          error: "URL not allowed. Use https public URLs only.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create source row (queued)
    const { data: sourceRow, error: insErr } = await supabase
      .from("akb_url_sources")
      .insert({
        user_id: user.id,
        workspace_id: body.workspace_id ?? null,
        url: body.url,
        normalized_url: normalized,
        status: "queued",
      })
      .select("*")
      .single();

    if (insErr || !sourceRow) throw insErr || new Error("Insert failed");

    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let resp: Response;
    try {
      resp = await fetch(normalized, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "GARVIS/1.0 (+https://gogarvis.com)",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8",
        },
      });
    } catch (e: any) {
      clearTimeout(timeout);
      await supabase
        .from("akb_url_sources")
        .update({
          status: "failed",
          error: e?.name === "AbortError" ? "Timeout (12s)" : e?.message,
          fetched_at: new Date().toISOString(),
        })
        .eq("id", sourceRow.id);
      throw e;
    }
    clearTimeout(timeout);

    const contentType = resp.headers.get("content-type") || "";
    const httpStatus = resp.status;

    if (!resp.ok) {
      await supabase
        .from("akb_url_sources")
        .update({
          status: "failed",
          http_status: httpStatus,
          content_type: contentType,
          error: `Fetch failed (${httpStatus})`,
          fetched_at: new Date().toISOString(),
        })
        .eq("id", sourceRow.id);

      return new Response(
        JSON.stringify({ error: `Fetch failed (${httpStatus})` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const maxBytes = 1_500_000;
    const buf = new Uint8Array(await resp.arrayBuffer());
    if (buf.byteLength > maxBytes) {
      await supabase
        .from("akb_url_sources")
        .update({
          status: "failed",
          http_status: httpStatus,
          content_type: contentType,
          bytes: buf.byteLength,
          error: "Content too large",
          fetched_at: new Date().toISOString(),
        })
        .eq("id", sourceRow.id);

      return new Response(JSON.stringify({ error: "Content too large" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = new TextDecoder("utf-8").decode(buf);

    // Parse
    let title: string | null = null;
    let text = raw;
    const isHtml =
      contentType.includes("text/html") || raw.includes("<html");
    if (isHtml) {
      const r = stripHtmlToText(raw);
      title = r.title;
      text = r.text;
    } else {
      text = raw.trim();
    }

    const wc = wordCount(text);
    const hash = await sha256Hex(text);

    // Persist parsed content
    await supabase.from("akb_url_pages").insert({
      user_id: user.id,
      source_id: sourceRow.id,
      url: normalized,
      title,
      text_content: text,
      word_count: wc,
    });

    // Mark source as parsed
    await supabase
      .from("akb_url_sources")
      .update({
        status: "parsed",
        http_status: httpStatus,
        content_type: contentType,
        content_hash: hash,
        bytes: buf.byteLength,
        fetched_at: new Date().toISOString(),
        parsed_at: new Date().toISOString(),
        meta: { title, word_count: wc },
      })
      .eq("id", sourceRow.id);

    // Create AKB upload record (flips intake gate)
    await supabase.from("akb_uploads").insert({
      user_id: user.id,
      workspace_id: body.workspace_id ?? null,
      kind: "url",
      filename: title ? `${title.slice(0, 80)}.url` : "url_ingest.url",
      mime_type: "text/url",
      size_bytes: buf.byteLength,
      source_type: "url",
      source_ref_id: sourceRow.id,
    });

    // Optional: create draft seed (requires human approval)
    if (body.create_draft) {
      const seedTitle = title?.slice(0, 80) || "Website Intake";
      const seedBody = [
        `Source URL: ${normalized}`,
        title ? `Page Title: ${title}` : "",
        `Word Count: ${wc}`,
        "",
        "Notes: (edit before approving)",
      ]
        .filter(Boolean)
        .join("\n");

      await supabase.from("akb_drafts").insert({
        user_id: user.id,
        workspace_id: body.workspace_id ?? null,
        domain: "intake",
        title: seedTitle,
        body_md: seedBody,
        proposed_by: "system",
        status: "draft",
        sources: JSON.stringify([
          { type: "url", ref_id: sourceRow.id, url: normalized },
        ]),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        source_id: sourceRow.id,
        url: normalized,
        title,
        word_count: wc,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
