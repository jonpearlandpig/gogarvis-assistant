import { useMemo } from "react";
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
  onLock: (domainKey: string) => void;
  onContinue: (domainKey: string, choice?: string) => void;
}

export function AKBGuidancePanel({ progress, onLock, onContinue }: Props) {
  const next = progress.nextDomain;

  const lockables = useMemo(
    () => progress.lockable.map((k) => ({ key: k, label: LABELS[k] || k })),
    [progress.lockable]
  );

  return (
    <div className="rounded-2xl border border-border bg-background/60 backdrop-blur p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-foreground uppercase tracking-wide">
            AKB Progress
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {progress.coveragePercent}% · {progress.completedCount}/{progress.total} locked
          </div>
        </div>
        {next ? (
          <div className="text-[11px] text-muted-foreground">
            Next: <span className="text-foreground">{LABELS[next] || next}</span>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">All minimums met</div>
        )}
      </div>

      {/* Domain status list */}
      <div className="mt-3 space-y-1">
        {progress.domains.map((d) => (
          <div key={d.domain_key} className="flex items-center gap-2 text-xs">
            <span className="text-[10px] w-3 text-center">
              {d.locked ? "🔒" : d.status === "complete" ? "✔" : d.status === "draft" ? "◐" : "○"}
            </span>
            <span className={d.status === "complete" || d.locked ? "text-foreground" : "text-muted-foreground"}>
              {LABELS[d.domain_key] ?? d.domain_key}
            </span>
            {d.min_met && !d.locked && (
              <span className="text-[9px] font-mono text-primary/70 ml-auto">ready to lock</span>
            )}
          </div>
        ))}
      </div>

      {/* Lockable domains */}
      {lockables.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
            Ready to lock
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {lockables.map((d) => (
              <button
                key={d.key}
                className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted/40 transition-colors"
                onClick={() => onLock(d.key)}
                type="button"
              >
                Lock {d.label}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">
            Locking is optional. You can always add more before locking.
          </div>
        </div>
      )}

      {/* Continue building next domain */}
      {next && (
        <div className="mt-4">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
            Continue building
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            Choose one to populate <span className="text-foreground">{LABELS[next] || next}</span> quickly:
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(QUICK_CHOICES[next] || []).map((c) => (
              <button
                key={c}
                className="rounded-full border border-border bg-muted/20 px-3 py-1 text-xs hover:bg-muted/40 transition-colors"
                onClick={() => onContinue(next, c)}
                type="button"
              >
                {c}
              </button>
            ))}
            <button
              className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted/40 transition-colors"
              onClick={() => onContinue(next)}
              type="button"
            >
              Custom…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
