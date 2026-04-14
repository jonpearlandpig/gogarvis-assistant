import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const { label, scopes } = await req.json();
    if (!label || typeof label !== "string") throw new Error("label is required");

    const validScopes = ["akb:read", "akb:write", "projects:read", "projects:write", "artifacts:read"];
    const scopeList: string[] = Array.isArray(scopes)
      ? scopes.filter((s: string) => validScopes.includes(s))
      : ["akb:read", "projects:read"];

    // Generate key
    const rawBytes = new Uint8Array(32);
    crypto.getRandomValues(rawBytes);
    const hex = Array.from(rawBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const plaintext = `gv_live_${hex}`;

    // Hash it
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(plaintext));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Store via service role client
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertErr } = await adminClient.from("api_keys").insert({
      user_id: user.id,
      key_hash: keyHash,
      label,
      scopes: scopeList,
    });

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({ key: plaintext, label, scopes: scopeList, warning: "Store this key securely — it cannot be retrieved again." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
