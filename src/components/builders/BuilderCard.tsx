import { cn } from "@/lib/utils";
import type { BuilderDef } from "@/lib/builders-registry";

interface Props {
  builder: BuilderDef;
  onStart: () => void;
  onSkip?: () => void;
  className?: string;
}

export function BuilderCard({ builder, onStart, onSkip, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background/80 p-3 transition-colors hover:bg-muted/20",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-foreground">{builder.title}</div>
        <div className="text-[10px] text-muted-foreground font-mono">
          {builder.timeEstimate}
        </div>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{builder.subtitle}</div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onStart}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted/30 transition-colors"
        >
          Start
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
