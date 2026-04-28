// Public REST API v1 — external integrations via gv_live_* API keys
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface ApiKeyRow {
  user_id: string;
  scopes: string[];
  label: string;
  revoked_at: string | null;
}

async function authenticate(req: Request, admin: any): Promise<{ user_id: string; scopes: string[]; label: string } | Response> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer gv_live_")) {
    return json({ error: "Missing or invalid API key. Use Authorization: Bearer gv_live_..." }, 401);
  }
  const token = auth.replace("Bearer ", "").trim();
  const keyHash = await sha256Hex(token);

  const { data, error } = await admin
    .from("api_keys")
    .select("user_id, scopes, label, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !data) return json({ error: "Invalid API key" }, 401);
  const row = data as ApiKeyRow;
  if (row.revoked_at) return json({ error: "API key has been revoked" }, 401);

  return { user_id: row.user_id, scopes: row.scopes || [], label: row.label };
}

function requireScope(user: { scopes: string[] }, scope: string): Response | null {
  if (!user.scopes.includes(scope)) {
    return json({ error: `Missing required scope: ${scope}` }, 403);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authResult = await authenticate(req, admin);
    if (authResult instanceof Response) return authResult;
    const user = authResult;

    const url = new URL(req.url);
    const route = url.searchParams.get("route") || "";
    const id = url.searchParams.get("id");

    // ─── GET /?route=info ──── connection check ────
    if (route === "info" || route === "") {
      return json({
        ok: true,
        api: "garvis-v1",
        connection: user.label,
        user_id: user.user_id,
        scopes: user.scopes,
        endpoints: [
          "GET ?route=projects",
          "GET ?route=projects&id=<uuid>",
          "GET ?route=domains",
          "GET ?route=drafts",
          "GET ?route=artifacts",
          "GET ?route=attention",
          "POST ?route=drafts (body: {domain,title,body_md})",
          "POST ?route=context&id=<project_id> (body: {domain_key,field_key,value,status})",
        ],
      });
    }

    // ─── GET projects ────
    if (route === "projects" && req.method === "GET") {
      const scopeErr = requireScope(user, "projects:read");
      if (scopeErr) return scopeErr;

      if (id) {
        const { data: proj } = await admin
          .from("akb_projects")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.user_id)
          .maybeSingle();
        if (!proj) return json({ error: "Project not found" }, 404);

        const { data: ctx } = await admin
          .from("akb_project_context")
          .select("domain_key, field_key, value, status")
          .eq("project_id", id)
          .eq("user_id", user.user_id);

        return json({ project: proj, context: ctx || [] });
      }

      const { data } = await admin
        .from("akb_projects")
        .select("id, name, status, created_at")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false });
      return json({ projects: data || [] });
    }

    // ─── GET domains ────
    if (route === "domains" && req.method === "GET") {
      const scopeErr = requireScope(user, "akb:read");
      if (scopeErr) return scopeErr;

      const { data } = await admin
        .from("akb_domains")
        .select("domain_key, status, locked, min_met, progress_json, completed_at")
        .eq("user_id", user.user_id);
      return json({ domains: data || [] });
    }

    // ─── GET / POST drafts ────
    if (route === "drafts") {
      if (req.method === "GET") {
        const scopeErr = requireScope(user, "akb:read");
        if (scopeErr) return scopeErr;
        const { data } = await admin
          .from("akb_drafts")
          .select("id, domain, title, body_md, status, proposed_by, created_at, tags")
          .eq("user_id", user.user_id)
          .order("created_at", { ascending: false })
          .limit(100);
        return json({ drafts: data || [] });
      }
      if (req.method === "POST") {
        const scopeErr = requireScope(user, "akb:write");
        if (scopeErr) return scopeErr;
        const body = await req.json().catch(() => ({}));
        if (!body.domain || !body.title || !body.body_md) {
          return json({ error: "domain, title, and body_md are required" }, 400);
        }
        const { data, error } = await admin
          .from("akb_drafts")
          .insert({
            user_id: user.user_id,
            domain: body.domain,
            title: body.title,
            body_md: body.body_md,
            proposed_by: body.proposed_by || `external_api:${user.label}`,
            tags: Array.isArray(body.tags) ? body.tags : [],
            sources: [{ note: `External API (${user.label})` }],
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, draft: data });
      }
    }

    // ─── POST context ────
    if (route === "context" && req.method === "POST") {
      const scopeErr = requireScope(user, "akb:write");
      if (scopeErr) return scopeErr;
      if (!id) return json({ error: "id (project_id) query param required" }, 400);
      const body = await req.json().catch(() => ({}));
      if (!body.domain_key || !body.field_key) {
        return json({ error: "domain_key and field_key required" }, 400);
      }

      const { data: proj } = await admin
        .from("akb_projects")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.user_id)
        .maybeSingle();
      if (!proj) return json({ error: "Project not found" }, 404);

      const { error } = await admin
        .from("akb_project_context")
        .upsert(
          {
            user_id: user.user_id,
            project_id: id,
            domain_key: body.domain_key,
            field_key: body.field_key,
            value: body.value ?? "",
            status: body.status || "draft",
          },
          { onConflict: "user_id,project_id,domain_key,field_key" },
        );
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ─── GET artifacts ────
    if (route === "artifacts" && req.method === "GET") {
      const scopeErr = requireScope(user, "akb:read");
      if (scopeErr) return scopeErr;
      const { data } = await admin
        .from("artifacts")
        .select("id, title, type, status, created_at")
        .eq("user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(100);
      return json({ artifacts: data || [] });
    }

    // ─── GET attention — high-signal items for Jennie ────
    if (route === "attention" && req.method === "GET") {
      const scopeErr = requireScope(user, "akb:read");
      if (scopeErr) return scopeErr;

      const [domainsRes, draftsRes, projectsRes] = await Promise.all([
        admin.from("akb_domains")
          .select("domain_key, status, locked, min_met, progress_json")
          .eq("user_id", user.user_id),
        admin.from("akb_drafts")
          .select("id, domain, title, status, created_at")
          .eq("user_id", user.user_id)
          .eq("status", "draft")
          .order("created_at", { ascending: false })
          .limit(20),
        admin.from("akb_projects")
          .select("id, name, status, created_at")
          .eq("user_id", user.user_id)
          .order("created_at", { ascending: false }),
      ]);

      const domains = domainsRes.data || [];
      const completed = domains.filter((d: any) => d.status === "complete" || d.locked).length;
      const incompleteDomains = domains
        .filter((d: any) => d.status !== "complete" && !d.locked)
        .map((d: any) => d.domain_key);

      return json({
        summary: {
          projects_count: (projectsRes.data || []).length,
          domains_complete: completed,
          domains_total: domains.length,
          pending_drafts: (draftsRes.data || []).length,
        },
        incomplete_domains: incompleteDomains,
        pending_drafts: draftsRes.data || [],
        projects: projectsRes.data || [],
      });
    }

    return json({ error: `Unknown route: ${route}` }, 404);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
