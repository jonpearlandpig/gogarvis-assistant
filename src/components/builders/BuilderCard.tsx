// src/components/builders/BuilderCard.tsx
import { cn } from "@/lib/utils";
import type { BuilderDef } from "@/lib/builders-registry";

export function BuilderCard({
  builder,
  onStart,
  onSkip,
  className,
}: {
  builder: BuilderDef;
  onStart: () => void;
  onSkip?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-muted/10 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{builder.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{builder.subtitle}</div>
        </div>
        <div className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground">
          {builder.timeEstimate}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={onStart}
          className="w-full sm:w-auto rounded-full border border-border px-4 py-2 text-xs hover:bg-muted/30 transition-colors"
        >
          Start
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full sm:w-auto rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
