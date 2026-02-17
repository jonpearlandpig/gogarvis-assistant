import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { refusalPayload, enforceNoGuess, safeJsonParse, type GarvisAnswerPayload, type GarvisCitation } from "./lib/noGuess.ts";

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

const ORDERED_6 = ["identity", "goals", "offer", "audience", "assets", "financial_model"] as const;

// --- AKB Progress (deterministic, no-rush) ---
function evalMin(domain: string, counts: Record<string, number>): { min_met: boolean; progress: any } {
  const have = counts[domain] || 0;
  return { min_met: have >= 1, progress: { need: 1, have } };
}

async function computeAKBProgress(supabase: any, userId: string) {
  const [domRes, draftRes, lawRes] = await Promise.all([
    supabase.from("akb_domains").select("domain_key,status,locked,min_met,progress_json").eq("user_id", userId),
    supabase.from("akb_drafts").select("domain,status").eq("user_id", userId).eq("status", "approved"),
    supabase.from("akb_law").select("domain").eq("user_id", userId),
  ]);

  const domainMap = new Map(((domRes.data || []) as any[]).map((r: any) => [r.domain_key, r]));

  const counts: Record<string, number> = {};
  for (const r of ((draftRes.data || []) as any[])) {
    if (r.domain) counts[r.domain] = (counts[r.domain] || 0) + 1;
  }
  const lawDomains = new Set(((lawRes.data || []) as any[]).map((r: any) => r.domain));
  for (const d of lawDomains) counts[d] = (counts[d] || 0) + 1;

  const merged = ORDERED_6.map((k) => {
    const row = domainMap.get(k);
    let status = "empty";
    let locked = false;
    if (row) {
      status = row.status;
      locked = row.locked ?? false;
    } else if (lawDomains.has(k)) {
      status = "complete";
    } else if ((counts[k] || 0) > 0) {
      status = "draft";
    }
    const { min_met, progress } = evalMin(k, counts);
    return { domain_key: k, status, locked, min_met, progress_json: progress };
  });

  // Persist min_met/progress_json back to DB (upsert missing rows too)
  for (const r of merged) {
    const existing = domainMap.get(r.domain_key);
    if (existing) {
      await supabase.from("akb_domains").update({ min_met: r.min_met, progress_json: r.progress_json }).eq("user_id", userId).eq("domain_key", r.domain_key);
    }
    // Don't insert missing rows from edge function (RLS uses auth.uid(), service role not used here)
  }

  const completedCount = merged.filter((d: any) => d.status === "complete" || d.locked).length;
  const total = merged.length;
  const coveragePercent = Math.round((completedCount / total) * 100);
  const lockable = merged.filter((d: any) => d.min_met && !d.locked).map((d: any) => d.domain_key);
  const nextDomain = merged.find((d: any) => !d.locked && !d.min_met)?.domain_key || null;

  return { domains: merged, lockable, nextDomain, coveragePercent, completedCount, total };
}

type AKBMode = "locked" | "foundation" | "full";
type ScopeMode = "home" | "project";

interface ScopeContract {
  mode: ScopeMode;
  project_id: string | null;
  cross_project_allowed: boolean;
}

// --- Scope & AKB prompt (always injected) ---
function buildScopePrompt(scope: ScopeContract, canonical: any, projectOverlay: any, merged: any) {
  return `
SCOPE & AKB RULES (ALWAYS ON)

You are GARVIS. Your capabilities/operators never change. Only the AKB scope changes.

CURRENT SCOPE: ${scope.mode.toUpperCase()}${scope.project_id ? ` (project_id: ${scope.project_id})` : ""}
CROSS-PROJECT ALLOWED: ${scope.cross_project_allowed}

SCOPES
- HOME SCOPE: Use Canonical AKB only. You may pull info across projects ONLY when the user request explicitly requires it.
- PROJECT SCOPE: Use Canonical AKB + this Project AKB overlay. Do NOT use other projects' info.

BOUNDARIES
- In PROJECT scope: if the user asks about something not present in this project's AKB/artifacts, respond:
  "Not found in this project. Search other projects?"
  Then ask the user to choose: (A) search other projects (B) switch to Home (C) add it to this project.
- In HOME scope: if user mentions multiple deals/projects, you may propose selecting projects to pull from. Do not guess which projects; ask user to pick from a list.

CONFLICT RULE
- Canonical governs tone/intent/dealbreakers always.
- Project overlay adds project-specific facts/constraints only.
- If Canonical conflicts with Project: Canonical wins.

NO SILENT CROSS-PROJECT LEAKAGE
- Never use other project data while in PROJECT scope.
- Never "assume" a deal belongs to a project without user selection.

MUTATION GUARD
- Never modify Canonical AKB while in Project Mode.
- If asked to change Canonical inside a project, reply:
  "Canonical layer cannot be modified inside a project. Switch to Canonical mode to update it."

CANONICAL INTENT:
${JSON.stringify(canonical || {}, null, 2)}

${scope.mode === "project" && projectOverlay ? `PROJECT CONTEXT:
${JSON.stringify(projectOverlay, null, 2)}
` : ""}
MERGED CONTEXT (use this for responses):
${JSON.stringify(merged, null, 2)}
`.trim();
}

// --- AKB soft-lock coaching prompt ---
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
    const body = await req.json();
    const { messages, scope: rawScope, intent } = body;

    // Parse scope contract (default to home)
    const scope: ScopeContract = rawScope || { mode: "home", project_id: null, cross_project_allowed: true };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ===========================================
    // FETCH AUTHENTICATED USER
    // ===========================================
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
    const { data: claimsData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !claimsData?.user) {
      console.error("Auth user error:", authError);
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = { id: claimsData.claims.sub as string };

    // ===========================================
    // SCOPE ENFORCEMENT
    // ===========================================

    // Block canonical mutation inside project scope
    if (scope.mode === "project" && intent === "update_canonical") {
      return new Response(
        JSON.stringify({ error: "Canonical layer cannot be modified inside project scope." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===========================================
    // HARD SCOPE BOUNDARY
    // ===========================================
    const latestUserMessage =
      messages?.filter((m: any) => m.role === "user").slice(-1)[0]?.content || "";

    const crossProjectIntent =
      /other project|another deal|compare|across projects|pull from/i.test(
        latestUserMessage
      );

    if (scope.mode === "project" && crossProjectIntent) {
      return new Response(
        JSON.stringify({
          ui_action: "not_here",
          reason: "cross_project_request",
          message:
            "This deal is not in the current project. Do you want to check elsewhere?",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-UI-ACTION": "not_here",
          },
        }
      );
    }

    // ===========================================
    // SCOPED AKB: Canonical + Project context
    // ===========================================
    let canonical: any = null;
    let projectOverlay: Record<string, string> | null = null;
    let merged: any = {};

    try {
      const { data: canonicalData } = await supabase
        .from("akb_user_canonical")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      canonical = canonicalData;

      if (scope.mode === "project" && scope.project_id) {
        const { data: ctxRows } = await supabase
          .from("akb_project_context")
          .select("*")
          .eq("project_id", scope.project_id)
          .eq("status", "complete");

        projectOverlay = (ctxRows || []).reduce((acc: Record<string, string>, row: any) => {
          acc[row.field_key] = row.value;
          return acc;
        }, {});
      }

      // Governance keys are always canonical (immutable)
      const governance = {
        tone_profile: canonical?.tone_profile,
        communication_style: canonical?.communication_style,
        decision_philosophy: canonical?.decision_philosophy,
        deal_breakers: canonical?.deal_breakers,
        strategic_intent: canonical?.strategic_intent,
      };

        ...governance,
        ...(projectOverlay || {}),
      };
    } catch (e) {
      console.error("Scoped AKB fetch failed:", e);
    }

    // ===========================================
    // AKB SOFT MODE CHECK
    // ===========================================
    let akb = { mode: "locked" as AKBMode, approvedCount: 0, domainsCovered: [] as string[], requiredMissing: [] as string[], coveragePct: 0 };
    try {
      akb = await computeAKBStatus(supabase, user.id);
    } catch (e) {
      console.error("AKB status check failed:", e);
    }

    // ===========================================
    // FETCH LATEST UOP VERSION
    // ===========================================
    let profileInjection = "";
    const { data: uopRow } = await supabase
      .from("user_profile_versions")
      profileInjection = `
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
    // Build system messages
    // ===========================================
    // Compute AKB progress (no-rush)
    let akbProgress: any = null;
    try {
      akbProgress = await computeAKBProgress(supabase, user.id);
    } catch (e) {
      console.error("AKB progress computation failed:", e);
    }

    const scopePrompt = buildScopePrompt(scope, canonical, projectOverlay, merged);
    const akbSoftMsg = buildAKBSoftModeSystemMessage(akb);

    // No-rush progress prompt
    const akbProgressPrompt = akbProgress ? `
AKB PROGRESS RULES (NO RUSH)
- Never pressure the user to fill AKB.
- If a domain meets minimum requirements, offer two actions:
  (A) "Lock this domain" (freezes it; moves user forward)
  (B) "Add more" (suggest 3-7 selectable options; minimal typing)
- If user is missing minimum requirements, offer 3-7 selectable options to complete it.
- If user asks "am I ready?" answer with: current %, X/Y locked, next recommended, lockable list.
- Keep guidance short and menu-like; prefer choices over questions.

CURRENT AKB PROGRESS:
- Coverage: ${akbProgress.coveragePercent}% (${akbProgress.completedCount}/${akbProgress.total})
- Next domain: ${akbProgress.nextDomain || "none"}
- Lockable domains: ${akbProgress.lockable.length > 0 ? akbProgress.lockable.join(", ") : "none"}
`.trim() : "";

    // ===========================================
    // NO-GUESS RETRIEVAL GATE
    // ===========================================
    // Fetch AKB evidence (drafts, uploads, project context) to build citations
    const [draftsRes, uploadsRes, projectCtxRes] = await Promise.all([
      supabase.from("akb_drafts").select("id, domain, title, status").eq("user_id", user.id).in("status", ["approved", "draft"]).limit(50),
      supabase.from("akb_uploads").select("id, filename, kind").eq("user_id", user.id).limit(50),
      scope.project_id
        ? supabase.from("akb_project_context").select("id, domain_key, field_key, value").eq("project_id", scope.project_id).limit(50)
        : Promise.resolve({ data: [] }),
    ]);

    const retrievalHits: GarvisCitation[] = [];
    for (const d of (draftsRes.data || [])) {
      retrievalHits.push({ kind: d.status === "approved" ? "akb_approved" : "akb_draft", id: d.id, label: d.title || d.domain });
    }
    for (const u of (uploadsRes.data || [])) {
      retrievalHits.push({ kind: "akb_upload", id: u.id, label: u.filename || u.kind });
    }
    for (const c of ((projectCtxRes as any).data || [])) {
      retrievalHits.push({ kind: "project_context", id: c.id, label: `${c.domain_key}/${c.field_key}` });
    }

    // Determine if this is a factual query that needs evidence
    // AKB coaching mode (locked) doesn't need evidence — it's asking questions
    const needsEvidence = akb.mode !== "locked";

    if (needsEvidence && retrievalHits.length === 0) {
      const out: GarvisAnswerPayload = refusalPayload({
        headline: "Cannot answer from AKB",
        reason: "I don't have evidence in your AKB to answer this without guessing. Upload a source, or choose a QuickStart.",
        next_steps: [
          { type: "upload", label: "Upload the doc that contains this" },
          { type: "open_recent_uploads", label: "Review recent uploads" },
          { type: "open_builder", label: "Quick Profile Lock", step: "identity" },
        ],
      });

      return new Response(JSON.stringify(out), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build retrieval context for the model
    const retrievalContext = retrievalHits.length > 0
      ? `\nAVAILABLE AKB EVIDENCE (${retrievalHits.length} items):\n${retrievalHits.map(h => `- [${h.kind}] ${h.label || h.id}`).join("\n")}\n\nIMPORTANT: When answering, you MUST include a "citations" array referencing the evidence you used. If you cannot ground your answer in this evidence, say so.`
      : "";

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
            { role: "system", content: scopePrompt },
            ...(profileInjection
              ? [{ role: "system", content: profileInjection }]
              : []),
            ...(akbSoftMsg
              ? [{ role: "system", content: akbSoftMsg }]
              : []),
            ...(akbProgressPrompt
              ? [{ role: "system", content: akbProgressPrompt }]
              : []),
            ...(retrievalContext
              ? [{ role: "system", content: retrievalContext }]
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

    // Fetch completed domains from akb_domains table
    const { data: domainRows } = await supabase
      .from("akb_domains")
      .select("domain_key, status")
      .eq("user_id", user.id);

    const completedDomains = (domainRows || [])
      .filter((r: any) => r.status === "complete")
      .map((r: any) => r.domain_key);

    // Pass AKB mode + scope to client via headers
    const headers = new Headers({
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-AKB-Mode": akb.mode,
      "X-AKB-Coverage": String(akb.coveragePct),
      "X-AKB-Completed-Domains": JSON.stringify(completedDomains),
      "X-AKB-Progress": JSON.stringify(akbProgress ? { lockable: akbProgress.lockable, nextDomain: akbProgress.nextDomain, coveragePercent: akbProgress.coveragePercent } : {}),
      "X-Scope-Mode": scope.mode,
      "X-Scope-Project-Id": scope.project_id || "",
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
