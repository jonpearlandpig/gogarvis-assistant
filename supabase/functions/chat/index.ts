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

// --- AKB gating config ---
const REQUIRED_DOMAINS = ["identity", "goals", "offer", "audience", "operations", "authority"] as const;
const TARGET_DOMAINS = [
  "identity", "goals", "offer", "audience", "operations", "authority",
  "brand", "financials", "assets_ip", "systems_templates",
] as const;

type AKBMode = "locked" | "foundation" | "full";

function buildAKBSoftModeSystemMessage(s: {
  mode: AKBMode;
  approvedCount: number;
  requiredMissing: string[];
  domainsCovered: string[];
  coveragePct: number;
}) {
  if (s.mode !== "locked") return "";

  return `
AKB SOFT-LOCK MODE ACTIVE (FOUNDATION COACH)

HARD LIMIT: Choose exactly ONE missing domain and ask no more than 3 focused questions about it. Do not move to another domain in the same response.

GARVIS ROLE:
You are an AKB Coach. Your job is to help the user build the 6-starter AKB foundation quickly and comfortably.
Do NOT behave like a test. Do NOT demand exhaustive details. Do NOT output strategies/plans/artifacts yet.

WHAT YOU MAY DO:
- Ask 1–3 lightweight questions per turn.
- Offer 3–6 multiple-choice options per question (A/B/C…).
- Accept "Other: ____" answers.
- Summarize the user's choices back as 1–3 ready-to-save "Quick Notes" (Domain + Title + Body).
- Ask for one supporting source per domain (upload or quick note counts).

WHAT YOU MAY NOT DO (until FOUNDATION):
- No deliverables (no marketing plans, decks, SOPs, calendars, pricing models, etc.)
- No artifact creation requests
- No pretending AKB is complete

CURRENT STATUS:
- Covered domains: ${s.domainsCovered.join(", ") || "(none)"}
- Missing domains: ${s.requiredMissing.join(", ")}
- Coverage: ${s.coveragePct}%

FOUNDATION = ALL 6 DOMAINS APPROVED WITH SOURCES:
${REQUIRED_DOMAINS.join(", ")}

COACHING STYLE:
- Friendly, decisive, non-judgmental
- Short, conversational
- Ask choices, not essays
- Never overwhelm

EACH TURN MUST FOLLOW THIS FORMAT:

1) What we're setting today (pick one missing domain)
2) 1–3 choice-based questions
3) "Quick Note Draft(s)" (ready to paste into AKB Builder → Inbox → Quick Note)
4) Next step: "Save these as Drafts, then Approve in Drafts tab."

DOMAIN PLAYBOOK (use when that domain is missing)

IDENTITY (who/what we are)
Ask:
- What is this AKB for?
  A) Company / studio  B) Single project  C) Tour/production  D) Personal OS  E) Other
- Core mission vibe:
  A) Scale revenue  B) Ship product  C) Protect IP  D) Reduce chaos  E) Other
- Non-negotiables / deal breakers (choose 2):
  A) No hallucinations  B) No brand drift  C) No unapproved publishing  D) No legal advice without source  E) Other

GOALS (what success looks like)
Ask:
- Time horizon:
  A) 2 weeks  B) 30 days  C) 90 days  D) Year
- Top priority (choose one):
  A) Build system  B) Launch offer  C) Close deals  D) Produce content  E) Operational cleanup
- "Done looks like":
  Provide 3 sample outcomes to choose from + Other.

OFFER (what we sell/build)
Ask:
- Type:
  A) Service  B) Product  C) Licensing/IP  D) Tour/live  E) SaaS/OS
- Buyer:
  A) Consumers  B) B2B  C) Sponsors  D) Partners  E) Internal
- Pricing posture:
  A) Premium  B) Mid  C) Low  D) Unknown yet

AUDIENCE (who this is for)
Ask:
- Primary audience:
  A) Fans  B) Clients  C) Churches  D) Artists  E) Businesses  F) Other
- Positioning angle:
  A) Speed  B) Trust  C) Quality  D) Cost  E) Differentiation
- Competitor reference:
  A) None  B) Like X but better  C) Replacing X

OPERATIONS (how work gets done)
Ask:
- Current tools:
  A) Google  B) Microsoft  C) Notion  D) Slack  E) Salesforce  F) Other
- Main bottleneck:
  A) Too many asks  B) No source-of-truth  C) Slow approvals  D) Scattered files  E) Other
- Preferred output format:
  A) Bullets  B) Tables  C) Checklists  D) One-pagers

AUTHORITY (who decides)
Ask:
- Decision owner:
  A) Founder only  B) Founder + 1 approver  C) Team leads  D) Committee
- Escalation:
  A) Ask founder  B) Ask ops lead  C) Park it  D) Create ticket
- Communication style rules (choose):
  A) Direct/short  B) Strategic  C) Creative  D) Formal  E) Calm

SPECIAL: TONE + SYSTEM PROMPTS + DEAL BREAKERS
Whenever missing identity/authority:
- Tone preset:
  A) Direct operator  B) Executive strategic  C) Creative producer  D) Legal/compliance  E) Friendly coach
- System rules (pick 3):
  A) Cite sources when available
  B) Ask 1 clarifying question max
  C) If missing info: escalate
  D) Never invent names/numbers
  E) Keep answers under 8 lines
- Deal breakers (pick 2):
  A) Brand drift
  B) Unapproved "facts"
  C) Over-long answers
  D) Vague advice
  E) Anything not actionable

OUTPUT REQUIREMENT:
After the user answers, write 1–3 "Quick Note Drafts" in this exact schema:

QUICK NOTE DRAFT
Domain: <one of the 6>
Title: <short>
Body:
- <bullet truths>
- <deal breakers / tone rules if relevant>
Source Requested: <upload OR "This quick note is the source">

Then prompt:
"Paste each Quick Note into AKB Builder → Inbox → Quick Note → Save as Draft."
`.trim();
}

async function computeAKBStatus(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("akb_drafts")
    .select("domain,status,sources")
    .eq("user_id", userId)
    .eq("status", "approved");

  if (error) throw error;

  const approved = (data || []) as { domain: string; status: string; sources: any }[];
  const domainsCoveredSet = new Set<string>(approved.map((d) => d.domain).filter(Boolean));
  const domainsCovered = Array.from(domainsCoveredSet);
  const sourcesValid = approved.every((d) => Array.isArray(d.sources) && d.sources.length > 0);
  const requiredMissing = REQUIRED_DOMAINS.filter((d) => !domainsCoveredSet.has(d));
  const foundationOk = requiredMissing.length === 0 && sourcesValid;
  const targetCovered = TARGET_DOMAINS.filter((d) => domainsCoveredSet.has(d)).length;
  const coveragePct = Math.round((targetCovered / TARGET_DOMAINS.length) * 100);
  const fullOk = foundationOk && coveragePct >= 80;
  const mode: AKBMode = fullOk ? "full" : foundationOk ? "foundation" : "locked";

  return { mode, approvedCount: approved.length, domainsCovered, requiredMissing, coveragePct };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ===========================================
    // FETCH AUTHENTICATED USER
    // ===========================================
    let profileInjection = "";
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      console.error("Auth claims error:", authError);
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = { id: claimsData.claims.sub as string };

    // ===========================================
    // AKB SOFT MODE CHECK
    // ===========================================
    let akb = { mode: "locked" as AKBMode, approvedCount: 0, domainsCovered: [] as string[], requiredMissing: [] as string[], coveragePct: 0 };
    try {
      akb = await computeAKBStatus(supabase, user.id);
    } catch (e) {
      console.error("AKB status check failed:", e);
      // fail-open to locked mode for safety
    }

    // ===========================================
    // FETCH LATEST UOP VERSION
    // ===========================================
    const { data: uopRow } = await supabase
      .from("user_profile_versions")
      .select("config_json, version_number, telauthorium_id")
      .eq("user_id", user.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const uop = uopRow?.config_json as any;

    if (uop) {
      const focus = uop.garvis_lens || {
        systems: 0, creative: 0, architect: 0, business: 0, risk: 0,
      };

      const sum = focus.systems + focus.creative + focus.architect + focus.business + focus.risk || 1;

      const norm = {
        systems: Math.round((focus.systems / sum) * 100),
        creative: Math.round((focus.creative / sum) * 100),
        architect: Math.round((focus.architect / sum) * 100),
        business: Math.round((focus.business / sum) * 100),
        risk: Math.round((focus.risk / sum) * 100),
      };

      const lead = Object.entries(norm).sort((a, b) => b[1] - a[1])[0]?.[0];

      profileInjection = `
USER OPERATING PROFILE ACTIVE:
Version: v${uopRow.version_number}
Telauthorium ID: ${uopRow.telauthorium_id}

Phase Bias: ${uop.phase_bias || "none"}
Objective: ${uop.objective || ""}
Tone: ${uop.tone || "default"}
Include Risk Review: ${uop.include_risk_review ?? false}
Advanced Notes: ${uop.advanced_notes || ""}

GARVIS LENS (Normalized):
Systems: ${norm.systems}%
Creative: ${norm.creative}%
Architect: ${norm.architect}%
Business: ${norm.business}%
Risk: ${norm.risk}%

Lead Lens: ${lead}

COMPOSITION RULE:
Lead with the highest weighted lens.
Shape the response accordingly.
`;
    }

    // ===========================================
    // AKB soft-mode injection
    // ===========================================
    const akbSoftMsg = buildAKBSoftModeSystemMessage(akb);

    // ===========================================
    // MODEL CALL
    // ===========================================
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
            { role: "system", content: GARVIS_SYSTEM_PROMPT },
            ...(profileInjection
              ? [{ role: "system", content: profileInjection }]
              : []),
            ...(akbSoftMsg
              ? [{ role: "system", content: akbSoftMsg }]
              : []),
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

    // Pass AKB mode to client via headers
    const headers = new Headers({
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-AKB-Mode": akb.mode,
      "X-AKB-Coverage": String(akb.coveragePct),
    });

    return new Response(response.body, { headers });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
