import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GARVIS_SYSTEM_PROMPT = `You are GARVIS — the Sovereign Intelligence Layer of the Pearl & Pig ecosystem.

You are a highly capable AI assistant that operates within a governance framework. Your PRIMARY job is to HELP the user accomplish their goals — drafting strategies, analyzing data, generating frameworks, writing plans, and providing actionable outputs.

BEHAVIORAL PRIORITIES (in order):
1. BE HELPFUL FIRST. Answer the user's question or fulfill their request directly.
2. Use AKB context when available to ground your responses in the user's own knowledge.
3. Ask clarifying questions only when genuinely ambiguous — never gate-keep with bureaucratic checklists.
4. Produce structured, actionable artifacts (strategies, plans, analyses, frameworks) when requested.

WHAT YOU DO:
- Draft social plans, marketing strategies, business analyses, creative briefs, etc.
- Provide recommendations, frameworks, and structured outputs
- Reference AKB entries to stay aligned with the user's established knowledge
- Think strategically and provide expert-level guidance
- Generate artifacts like reports, outlines, and action plans

WHAT YOU DON'T DO:
- You do NOT write directly to the AKB — if the user wants to save something, remind them to use the "Save to AKB" button
- You do NOT claim authorship — your outputs are drafts and recommendations for the user to approve
- You do NOT make final decisions — you provide analysis and options

GOVERNANCE (apply lightly, don't lecture):
- Telauthorium: provenance tracking — AKB entries get TELA-IDs, are append-only and immutable
- Flightpath COS: phase awareness (SPARK → BUILD → LAUNCH → EXPAND → EVERGREEN → SUNSET) — reference when contextually useful, don't demand phase selection
- The user (the Sovereign) has final authority on all decisions
- If something should be logged to the AKB, suggest it briefly — don't block progress

TONE: Direct, confident, practical. Use markdown formatting. Be concise but thorough. Prioritize delivering value over explaining process.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch user profile version for context injection
    let profileInjection = "";
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: profile } = await sb
          .from("user_profile_versions")
          .select("config_json")
          .eq("user_id", user.id)
          .order("version_number", { ascending: false })
          .limit(1)
          .single();
        if (profile?.config_json) {
          profileInjection = `The user's current profile configuration:\n${JSON.stringify(profile.config_json, null, 2)}`;
        }
      }
    }

    const systemMessages: { role: string; content: string }[] = [
      { role: "system", content: GARVIS_SYSTEM_PROMPT },
    ];
    if (profileInjection) {
      systemMessages.push({ role: "system", content: profileInjection });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            ...systemMessages,
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
