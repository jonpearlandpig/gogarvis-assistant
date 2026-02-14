import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface StructureEntry {
  domain_key: string;
  field_key: string;
  value: string;
  status: "draft" | "complete";
  source_type: "chat" | "upload" | "url";
  updated_at?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  entries: StructureEntry[];
}

const DOMAIN_LABELS: Record<string, string> = {
  identity: "Identity",
  goals: "Goals",
  offer: "Offer",
  audience: "Audience",
  assets: "Assets",
  financial_model: "Financial Model",
};

const DOMAIN_ORDER = ["identity", "goals", "offer", "audience", "assets", "financial_model"];

export function AKBStructurePanel({ open, onClose, entries }: Props) {
  const [showTechnical, setShowTechnical] = useState(false);

  if (!open) return null;

  const grouped = DOMAIN_ORDER.map((dk) => ({
    domain_key: dk,
    fields: entries.filter((e) => e.domain_key === dk),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl shadow-black/40 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-mono font-semibold text-foreground tracking-wide">
            AKB Structure
          </h2>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>

        {/* Domain Tree */}
        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-4">
            {grouped.map((d) => {
              const completeCount = d.fields.filter((f) => f.status === "complete").length;
              const isEmpty = d.fields.length === 0;

              return (
                <div key={d.domain_key} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-mono font-medium",
                        completeCount > 0
                          ? "text-[hsl(var(--garvis-success))]"
                          : isEmpty
                          ? "text-muted-foreground"
                          : "text-[hsl(var(--garvis-warn))]"
                      )}
                    >
                      {DOMAIN_LABELS[d.domain_key] ?? d.domain_key}
                    </span>
                    {!isEmpty && (
                      <span className="text-[10px] text-muted-foreground">
                        {completeCount}/{d.fields.length}
                      </span>
                    )}
                  </div>

                  {isEmpty ? (
                    <div className="pl-3 text-[11px] text-muted-foreground/60 italic">
                      No entries yet
                    </div>
                  ) : (
                    <div className="pl-3 space-y-0.5">
                      {d.fields.map((f, i) => (
                        <div
                          key={`${f.field_key}-${i}`}
                          className="flex items-center justify-between text-[11px] py-0.5"
                        >
                          <span className="text-foreground font-mono truncate max-w-[280px]">
                            {f.field_key}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] shrink-0 ml-2",
                              f.status === "complete"
                                ? "text-[hsl(var(--garvis-success))]"
                                : "text-[hsl(var(--garvis-warn))]"
                            )}
                          >
                            {f.status === "complete" ? "✔" : "◐"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Technical Toggle */}
        <div className="border-t border-border px-5 py-3 space-y-2">
          <button
            onClick={() => setShowTechnical((p) => !p)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showTechnical ? "Hide Technical Detail" : "Show Technical Detail"}
          </button>

          {showTechnical && (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {entries.map((e, i) => (
                  <div
                    key={i}
                    className="text-[10px] font-mono border border-border rounded p-2 space-y-0.5 text-muted-foreground"
                  >
                    <p>Domain: {e.domain_key}</p>
                    <p>Field: {e.field_key}</p>
                    <p>Status: {e.status}</p>
                    <p>Source: {e.source_type}</p>
                    {e.updated_at && <p>Updated: {e.updated_at}</p>}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
