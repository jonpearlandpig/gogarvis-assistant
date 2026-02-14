import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const DOMAIN_LABELS: Record<string, string> = {
  identity: "Identity",
  goals: "Goals",
  offer: "Offer",
  audience: "Audience",
  assets: "Assets",
  financial_model: "Financial Model",
};

interface Props {
  domains: { domain_key: string; status: "empty" | "draft" | "complete" }[];
  completedCount: number;
  total: number;
  coveragePercent: number;
  nextDomain: string | null;
  visible?: boolean;
}

export function AKBStatusBar({
  domains,
  completedCount,
  total,
  coveragePercent,
  nextDomain,
  visible = true,
}: Props) {
  if (!visible) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2.5 cursor-default select-none">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              AKB
            </span>

            <div className="flex gap-0.5">
              {domains.map((d, i) => (
                <div
                  key={d.domain_key}
                  className={cn(
                    "h-1.5 w-3 rounded-sm transition-colors",
                    d.status === "complete"
                      ? "bg-primary"
                      : d.status === "draft"
                        ? "bg-primary/40"
                        : "bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>

            <span className="text-[10px] font-mono text-foreground">
              {completedCount} / {total}
            </span>

            {nextDomain && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-[10px] text-muted-foreground">
                  Next: <span className="text-foreground">{DOMAIN_LABELS[nextDomain] ?? nextDomain}</span>
                </span>
              </>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent side="bottom" className="w-52">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Foundation</span>
              <span className="text-[10px] font-mono text-muted-foreground">{coveragePercent}%</span>
            </div>

            <div className="space-y-1">
              {domains.map((d) => (
                <div key={d.domain_key} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "text-[10px] w-3 text-center",
                      d.status === "complete"
                        ? "text-primary"
                        : d.status === "draft"
                          ? "text-primary/60"
                          : "text-muted-foreground"
                    )}
                  >
                    {d.status === "complete" ? "✔" : d.status === "draft" ? "◐" : "○"}
                  </span>
                  <span className={cn(
                    d.status === "complete" ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {DOMAIN_LABELS[d.domain_key] ?? d.domain_key}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
