// No-Guess enforcement types and helpers for GARVIS chat function

export type GarvisCitation = {
  kind: "akb_upload" | "akb_draft" | "akb_approved" | "project_context";
  id: string;
  label?: string;
  locator?: string;
};

export type GarvisNextStep =
  | { type: "upload"; label: string }
  | { type: "open_builder"; label: string; step: "identity" | "exec_summary" | "contacts" | "first_artifact" }
  | { type: "open_recent_uploads"; label: string }
  | { type: "open_ingest_run"; label: string; runId: string }
  | { type: "create_quickstart_drafts"; label: string; domain: "identity" | "offer" | "projects" | "assets" };

export type GarvisAnswerPayload = {
  refusal: boolean;
  answer: string;
  citations: GarvisCitation[];
  next_steps: GarvisNextStep[];
  meta?: Record<string, any>;
};

export function refusalPayload(params: {
  headline?: string;
  reason: string;
  next_steps?: GarvisNextStep[];
}): GarvisAnswerPayload {
  return {
    refusal: true,
    answer: params.headline ? `${params.headline}\n\n${params.reason}` : params.reason,
    citations: [],
    next_steps:
      params.next_steps?.length
        ? params.next_steps
        : [
            { type: "upload", label: "Upload a source doc" },
            { type: "open_recent_uploads", label: "Review recent uploads" },
            { type: "open_builder", label: "Quick Profile Lock", step: "identity" },
          ],
  };
}

/**
 * HARD GATE: no citations => refusal.
 * Prevents "guessy" answers by overwriting unsafe output.
 */
export function enforceNoGuess(
  output: Partial<GarvisAnswerPayload>,
  fallbackReason: string
): GarvisAnswerPayload {
  const citations = Array.isArray(output.citations) ? output.citations : [];
  const next_steps = Array.isArray(output.next_steps) ? output.next_steps : [];

  if (citations.length === 0) {
    return refusalPayload({
      headline: "Not enough AKB evidence",
      reason: fallbackReason,
      next_steps: next_steps.length ? next_steps : undefined,
    });
  }

  return {
    refusal: false,
    answer: typeof output.answer === "string" && output.answer.trim() ? output.answer : "",
    citations,
    next_steps,
    meta: output.meta || {},
  };
}

export function safeJsonParse(txt: string): any | null {
  try {
    return JSON.parse(txt);
  } catch {
    const m = txt.match(/\{[\s\S]*\}$/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}
