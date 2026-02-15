import { useState } from "react";
import { cn } from "@/lib/utils";

export function WhyAKBCollapsible({
  onStartBuilding,
  onExploreFirst,
}: {
  onStartBuilding?: () => void;
  onExploreFirst?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full max-w-xl mx-auto">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground hover:bg-muted/30 transition-colors"
      >
        <span className="font-mono truncate">Why build your AKB first?</span>
        <span className="shrink-0 text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all",
          open ? "max-h-[720px] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
        )}
      >
        <div className="rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p>
              Most AI tools fail for predictable reasons: hallucinations, context
              drift, generic answers, and overreach.
            </p>
            <p>
              GARVIS avoids that by anchoring to your Authority Knowledge Base
              (AKB): tone, deal breakers, strategic intent, and operating posture.
            </p>
            <p>
              Lock each category when it feels right. Control stays with you.
              Doing this now gives you a three-lap head start in a four-lap race.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => onStartBuilding?.()}
              className="w-full sm:w-auto rounded-full border border-border px-5 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors"
            >
              Start Building My System
            </button>

            <button
              type="button"
              onClick={() => onExploreFirst?.()}
              className="w-full sm:w-auto rounded-full border border-border px-5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              Explore First (Limited Mode)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
