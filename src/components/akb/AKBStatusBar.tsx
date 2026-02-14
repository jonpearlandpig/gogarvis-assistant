import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  domainsComplete: number; // 0–6
  coverage: number;        // 0–100
  visible?: boolean;
}

const DOMAINS = [
  "Identity",
  "Goals",
  "Offer",
  "Audience",
  "Assets",
  "Financial Model",
];

export function AKBStatusBar({ domainsComplete, coverage, visible = true }: Props) {
  if (!visible) return null;

  const total = 6;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-default select-none">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                AKB
              </span>
              <span className="text-[10px] font-mono text-foreground">
                {coverage}%
              </span>
            </div>

            <div className="flex gap-0.5">
              {Array.from({ length: total }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 w-3 rounded-sm transition-colors",
                    i < domainsComplete
                      ? "bg-primary"
                      : "bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>

            <span className="text-[10px] font-mono text-muted-foreground">
              {domainsComplete} / {total}
            </span>
          </div>
        </TooltipTrigger>

        <TooltipContent side="bottom" className="w-48">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold">AKB Coverage</div>
            {DOMAINS.map((d, i) => (
              <div key={d} className="flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "text-[10px]",
                    i < domainsComplete
                      ? "text-primary"
                      : i === domainsComplete
                        ? "text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  {i < domainsComplete ? "✔" : i === domainsComplete ? "•" : "○"}
                </span>
                <span className={cn(
                  i < domainsComplete ? "text-foreground" : "text-muted-foreground"
                )}>
                  {d}
                </span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
