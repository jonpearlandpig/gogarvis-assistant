import ReactMarkdown from "react-markdown";

export type GarvisCitation = {
  kind: string;
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

export function isGarvisPayload(obj: any): obj is GarvisAnswerPayload {
  return obj && typeof obj === "object" && typeof obj.refusal === "boolean" && typeof obj.answer === "string";
}

export function GarvisMessage({
  payload,
  onAction,
}: {
  payload: GarvisAnswerPayload;
  onAction: (action: GarvisNextStep) => void;
}) {
  const hasCites = Array.isArray(payload.citations) && payload.citations.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="prose-garvis text-sm">
        <ReactMarkdown>{payload.answer}</ReactMarkdown>
      </div>

      {/* Citations */}
      {hasCites && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {payload.citations.map((c, idx) => (
            <span
              key={`${c.kind}-${c.id}-${idx}`}
              className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
              title={c.locator || ""}
            >
              {c.label || `${c.kind}:${c.id.slice(0, 6)}`}
            </span>
          ))}
        </div>
      )}

      {/* Refusal actions (always clickable, never typing) */}
      {payload.refusal && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(payload.next_steps || []).slice(0, 4).map((a, i) => (
            <button
              key={i}
              onClick={() => onAction(a)}
              className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted/30 transition-colors"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
