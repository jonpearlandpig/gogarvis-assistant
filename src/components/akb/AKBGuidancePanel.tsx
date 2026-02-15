import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { AKBDomainProgress } from "@/hooks/useAKBProgress";

const LABELS: Record<string, string> = {
  identity: "Identity",
  goals: "Goals",
  offer: "Offer",
  audience: "Audience",
  assets: "Assets",
  financial_model: "Financial Model",
};

const QUICK_CHOICES: Record<string, string[]> = {
  identity: ["Founder-led", "Studio/Agency", "Product builder", "HoldCo / OS builder"],
  goals: ["2-week sprints", "Ship MVP", "Raise funds", "Close pilots"],
  offer: ["Service", "SaaS/OS", "Licensing/IP", "Hybrid"],
  audience: ["B2B", "B2C", "Partners", "Internal"],
  assets: ["Website", "Deck", "Case studies", "Docs/AKBs"],
  financial_model: ["Simple pricing", "Tiered pricing", "Rev-share", "Not set"],
};

interface Props {
  progress: {
    coveragePercent: number;
    completedCount: number;
    total: number;
    nextDomain: string | null;
    lockable: string[];
    domains: AKBDomainProgress[];
  };
  onLock: (domainKey: string) => Promise<void> | void;
  onContinue: (domainKey: string, choice?: string) => void;
  onClose?: () => void;
}

export function AKBGuidancePanel({ progress, onLock, onContinue, onClose }: Props) {
  const next = progress.nextDomain;
  const [locking, setLocking] = useState<string | null>(null);

  const lockables = useMemo(
    () => progress.lockable.map((k) => ({ key: k, label: LABELS[k] || k })),
    [progress.lockable]
  );

  return (
    <div className="w-full rounded-xl border border-border bg-background/80 backdrop-blur shadow-sm p-3 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-wide text-foreground">AKB Progress</div>
          <div className="text-[11px] text-muted-foreground">
            {progress.coveragePercent}% · {progress.completedCount}/{progress.total} locked
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-muted-foreground">
            {next ? <>Next: <span className="text-foreground">{LABELS[next] || next}</span></> : "All minimums met"}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center"
              aria-label="Close"
              title="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Domain status list */}
      <div className="space-y-1">
        {progress.domains.map((d) => (
          <div
            key={d.domain_key}
            className={cn(
              "flex items-center justify-between border border-border rounded px-2 py-2",
              d.locked && "animate-pulse"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="text-xs">
                {d.locked ? "🔒" : d.status === "complete" ? "✔" : d.status === "draft" ? "◐" : "○"}
              </div>
              <div className="text-xs text-foreground">{LABELS[d.domain_key] ?? d.domain_key}</div>
            </div>

            {d.min_met && !d.locked ? (
              <div className="text-[10px] text-muted-foreground">ready to lock</div>
            ) : (
              <div className="text-[10px] text-muted-foreground">{d.locked ? "locked" : ""}</div>
            )}
          </div>
        ))}
      </div>

      {/* Lockable domains */}
      {lockables.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-foreground uppercase tracking-wide">Ready to lock</div>
          <div className="flex flex-wrap gap-2">
            {lockables.map((d) => (
              <button
                key={d.key}
                type="button"
                disabled={locking === d.key}
                onClick={async () => {
                  setLocking(d.key);
                  try {
                    await onLock(d.key);
                  } finally {
                    setLocking(null);
                  }
                }}
                className={cn(
                  "rounded-full border border-border px-3 py-1 text-xs transition-colors",
                  "hover:bg-muted/40 disabled:opacity-60 disabled:hover:bg-transparent"
                )}
              >
                {locking === d.key ? `Locking ${d.label}…` : `Lock ${d.label}`}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Locking is optional. You can always add more before locking.
          </div>
        </div>
      )}

      {/* Continue building next domain */}
      {next && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-foreground uppercase tracking-wide">Continue building</div>
          <div className="text-[10px] text-muted-foreground">
            Choose one to populate {LABELS[next] || next} quickly:
          </div>

          <div className="flex flex-wrap gap-2">
            {(QUICK_CHOICES[next] || []).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onContinue(next, c)}
                className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs hover:bg-muted/50 transition-colors"
              >
                {c}
              </button>
            ))}

            <button
              type="button"
              onClick={() => onContinue(next)}
              className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted/40 transition-colors"
            >
              Custom…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
