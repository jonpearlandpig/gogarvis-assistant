import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Signal → Module mapping ──────────────────────────────
interface DetectionResult {
  module_key: string;
  confidence: number;
}

function detectModules(signals: Record<string, unknown>): DetectionResult[] {
  const results: DetectionResult[] = [];

  // ReceiptKeeper
  if (
    signals.has_total &&
    signals.has_vendor &&
    signals.currency_symbol &&
    typeof signals.receipt_layout_score === "number" &&
    signals.receipt_layout_score > 0.7
  ) {
    results.push({
      module_key: "receiptkeeper",
      confidence: signals.receipt_layout_score as number,
    });
  }

  // InvoiceWatch
  if (
    signals.has_invoice_number &&
    signals.has_due_date &&
    typeof signals.invoice_layout_score === "number" &&
    signals.invoice_layout_score > 0.7
  ) {
    results.push({
      module_key: "invoicewatch",
      confidence: signals.invoice_layout_score as number,
    });
  }

  // ContractVault
  if (
    signals.has_parties &&
    signals.has_terms &&
    typeof signals.contract_layout_score === "number" &&
    signals.contract_layout_score > 0.7
  ) {
    results.push({
      module_key: "contractvault",
      confidence: signals.contract_layout_score as number,
    });
  }

  // MeetingRecall
  if (
    signals.has_attendees &&
    signals.has_action_items &&
    typeof signals.meeting_score === "number" &&
    signals.meeting_score > 0.7
  ) {
    results.push({
      module_key: "meetingrecall",
      confidence: signals.meeting_score as number,
    });
  }

  return results;
}

// ── Activation score computation ─────────────────────────
async function computeActivationScore(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  moduleKey: string
): Promise<{ avgConfidence: number; activationScore: number }> {
  const { data: recent } = await supabase
    .from("garvis_module_detections")
    .select("confidence")
    .eq("user_id", userId)
    .eq("module_key", moduleKey)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!recent || recent.length === 0) {
    return { avgConfidence: 0, activationScore: 0 };
  }

  const avgConfidence =
    recent.reduce((sum: number, r: { confidence: number }) => sum + r.confidence, 0) /
    recent.length;

  const frequencyWeight = Math.min(recent.length / 5, 1);

  const activationScore = avgConfidence * 0.6 + frequencyWeight * 0.3;

  return { avgConfidence, activationScore };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const body = await req.json();
    const { source_type, source_id, signals } = body;

    if (!source_type || !signals || typeof signals !== "object") {
      return new Response(
        JSON.stringify({ error: "source_type and signals required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const detections = detectModules(signals);

    if (detections.length === 0) {
      return new Response(
        JSON.stringify({ detections: [], activations: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activations: Array<{
      module_key: string;
      status: string;
      activation_score: number;
    }> = [];

    for (const det of detections) {
      // Step 3: Insert detection log
      await supabase.from("garvis_module_detections").insert({
        user_id: user.id,
        module_key: det.module_key,
        source_type,
        source_id: source_id || null,
        confidence: det.confidence,
        signal_json: signals,
      });

      // Step 4: Compute activation score
      const { avgConfidence, activationScore } = await computeActivationScore(
        supabase,
        user.id,
        det.module_key
      );

      // Step 5: Check threshold and upsert status
      const { data: moduleDef } = await supabase
        .from("garvis_modules")
        .select("activation_threshold")
        .eq("module_key", det.module_key)
        .single();

      const threshold = moduleDef?.activation_threshold ?? 0.85;
      const newStatus =
        activationScore >= threshold ? "activated" : "suggested";

      await supabase.from("garvis_user_modules").upsert(
        {
          user_id: user.id,
          module_key: det.module_key,
          status: newStatus,
          confidence: avgConfidence,
          activation_score: activationScore,
          activated_at:
            newStatus === "activated" ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,module_key" }
      );

      activations.push({
        module_key: det.module_key,
        status: newStatus,
        activation_score: activationScore,
      });
    }

    return new Response(
      JSON.stringify({ detections, activations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
