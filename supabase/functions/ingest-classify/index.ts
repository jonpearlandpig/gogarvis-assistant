import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOCUMENT_TYPES = [
  "executive_summary",
  "pitch_deck",
  "creative_brief",
  "ip_bible",
  "contract",
  "financial_model",
  "org_chart",
  "misc",
] as const;

const ENTITY_TYPES = [
  "company", "brand", "product", "project", "person_role",
  "deal", "ip_title", "asset", "date", "kpi",
] as const;

const AKB_DOMAINS = [
  "identity", "offer", "audience", "assets", "financial_model", "goals",
  "brand", "contacts", "ops", "risk", "projects",
] as const;

const INDUSTRY_KEYS = [
  "agency", "saas", "touring", "law_ops", "construction",
  "food_beverage", "creative_studio", "consulting", "ecommerce",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingest_run_id } = await req.json();
    if (!ingest_run_id) throw new Error("ingest_run_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Fetch ingest run
    const { data: run, error: runErr } = await supabase
      .from("ingest_runs")
      .select("*")
      .eq("id", ingest_run_id)
      .eq("user_id", userId)
      .single();

    if (runErr || !run) {
      return new Response(JSON.stringify({ error: "Ingest run not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to classifying
    await supabase.from("ingest_runs").update({ status: "classifying" }).eq("id", ingest_run_id);

    // Fetch associated uploads
    const sourceFileIds = (run.source_file_ids as string[]) || [];
    if (sourceFileIds.length === 0) {
      await supabase.from("ingest_runs").update({ status: "failed", detected_types: [] }).eq("id", ingest_run_id);
      return new Response(JSON.stringify({ error: "No source files" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: uploads } = await supabase
      .from("akb_uploads")
      .select("id, filename, mime_type, kind, source_label")
      .in("id", sourceFileIds);

    // Also check for extraction data
    const { data: extractions } = await supabase
      .from("akb_extractions")
      .select("upload_id, extracted_json, confidence_score")
      .in("upload_id", sourceFileIds)
      .eq("status", "complete");

    // Also check URL pages for text content
    const { data: urlPages } = await supabase
      .from("akb_url_pages")
      .select("source_id, title, text_content, word_count")
      .eq("user_id", userId)
      .limit(10);

    // Build context for AI classification
    const fileDescriptions = (uploads || []).map((u: any) => ({
      id: u.id,
      filename: u.filename,
      mime_type: u.mime_type,
      kind: u.kind,
      source_label: u.source_label,
      extraction: (extractions || []).find((e: any) => e.upload_id === u.id)?.extracted_json || null,
    }));

    const urlContext = (urlPages || []).slice(0, 5).map((p: any) => ({
      title: p.title,
      word_count: p.word_count,
      excerpt: (p.text_content || "").slice(0, 500),
    }));

    // AI Classification call
    const classifyPrompt = `You are an intelligent document classifier and entity extractor for a business knowledge system.

Given these uploaded files and their extracted content, perform two tasks:

TASK 1 - CLASSIFY each file into one of: ${DOCUMENT_TYPES.join(", ")}
TASK 2 - EXTRACT all entities found across all files

Entity types to look for: ${ENTITY_TYPES.join(", ")}

For each entity, provide:
- entity_type: one of the types above
- entity_name: the name/label
- confidence: 0.0-1.0
- source_file_id: which upload it came from
- excerpt: short quote from source (max 100 chars)

TASK 3 - MAP entities to AKB domains
For each meaningful grouping, suggest which AKB domain it maps to: ${AKB_DOMAINS.join(", ")}

TASK 4 - SUGGEST closest industry templates
Based on the business type detected, suggest 1-3 industry keys from: ${INDUSTRY_KEYS.join(", ")}

FILES:
${JSON.stringify(fileDescriptions, null, 2)}

${urlContext.length > 0 ? `URL CONTENT:\n${JSON.stringify(urlContext, null, 2)}` : ""}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You extract structured data from document descriptions. Always respond using the provided tool." },
          { role: "user", content: classifyPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_and_extract",
            description: "Classify documents, extract entities, and map to AKB domains",
            parameters: {
              type: "object",
              properties: {
                file_classifications: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      file_id: { type: "string" },
                      detected_type: { type: "string", enum: [...DOCUMENT_TYPES] },
                      confidence: { type: "number" },
                    },
                    required: ["file_id", "detected_type", "confidence"],
                  },
                },
                entities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      entity_type: { type: "string", enum: [...ENTITY_TYPES] },
                      entity_name: { type: "string" },
                      confidence: { type: "number" },
                      source_file_id: { type: "string" },
                      excerpt: { type: "string" },
                    },
                    required: ["entity_type", "entity_name", "confidence"],
                  },
                },
                domain_proposals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      domain: { type: "string", enum: [...AKB_DOMAINS] },
                      summary: { type: "string" },
                      bullets: { type: "array", items: { type: "string" } },
                      source_excerpts: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            file_id: { type: "string" },
                            excerpt: { type: "string" },
                          },
                        },
                      },
                    },
                    required: ["domain", "summary", "bullets"],
                  },
                },
                project_proposals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      project_name: { type: "string" },
                      description: { type: "string" },
                      recommended_modules: { type: "array", items: { type: "string" } },
                    },
                    required: ["project_name", "description"],
                  },
                },
                artifact_seeds: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      artifact_type: { type: "string" },
                      title: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["artifact_type", "title"],
                  },
                },
                industry_templates: {
                  type: "array",
                  items: { type: "string", enum: [...INDUSTRY_KEYS] },
                },
                overall_confidence: { type: "number" },
              },
              required: ["file_classifications", "entities", "domain_proposals", "overall_confidence"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_and_extract" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        await supabase.from("ingest_runs").update({ status: "failed" }).eq("id", ingest_run_id);
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        await supabase.from("ingest_runs").update({ status: "failed" }).eq("id", ingest_run_id);
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("ingest_runs").update({ status: "failed" }).eq("id", ingest_run_id);
      throw new Error("AI classification failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      await supabase.from("ingest_runs").update({ status: "failed" }).eq("id", ingest_run_id);
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Check confidence - if low, mark as needs_classification
    if (result.overall_confidence < 0.5) {
      await supabase.from("ingest_runs").update({
        status: "needs_classification",
        detected_types: result.file_classifications?.map((f: any) => f.detected_type) || [],
      }).eq("id", ingest_run_id);

      return new Response(JSON.stringify({
        status: "needs_classification",
        ingest_run_id,
        candidates: result.file_classifications,
        overall_confidence: result.overall_confidence,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store entities
    if (result.entities?.length > 0) {
      const entityInserts = result.entities.map((e: any) => ({
        ingest_id: ingest_run_id,
        user_id: userId,
        entity_type: e.entity_type,
        entity_name: e.entity_name,
        payload_json: { excerpt: e.excerpt, source_file_id: e.source_file_id },
        confidence: e.confidence || 0,
      }));
      await supabase.from("ingest_entities").insert(entityInserts);
    }

    // Create proposals
    const proposals: any[] = [];

    // AKB domain proposals
    for (const dp of (result.domain_proposals || [])) {
      proposals.push({
        ingest_id: ingest_run_id,
        user_id: userId,
        proposal_type: "akb_draft",
        target: dp.domain,
        summary: dp.summary,
        payload_json: { bullets: dp.bullets, domain: dp.domain },
        source_excerpts: dp.source_excerpts || [],
        status: "proposed",
      });
    }

    // Project scaffold proposals
    for (const pp of (result.project_proposals || [])) {
      proposals.push({
        ingest_id: ingest_run_id,
        user_id: userId,
        proposal_type: "project_scaffold",
        target: pp.project_name,
        summary: pp.description,
        payload_json: { recommended_modules: pp.recommended_modules || [] },
        source_excerpts: [],
        status: "proposed",
      });
    }

    // Artifact seed proposals
    for (const as_ of (result.artifact_seeds || [])) {
      proposals.push({
        ingest_id: ingest_run_id,
        user_id: userId,
        proposal_type: "artifact_seed",
        target: as_.artifact_type,
        summary: as_.title,
        payload_json: { description: as_.description },
        source_excerpts: [],
        status: "proposed",
      });
    }

    if (proposals.length > 0) {
      await supabase.from("ingest_proposals").insert(proposals);
    }

    // Update ingest run
    const detectedTypes = result.file_classifications?.map((f: any) => f.detected_type) || [];
    await supabase.from("ingest_runs").update({
      status: "proposed",
      detected_types: detectedTypes,
    }).eq("id", ingest_run_id);

    return new Response(JSON.stringify({
      status: "proposed",
      ingest_run_id,
      detected_types: detectedTypes,
      entity_count: result.entities?.length || 0,
      proposal_count: proposals.length,
      industry_templates: result.industry_templates || [],
      overall_confidence: result.overall_confidence,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ingest-classify error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
