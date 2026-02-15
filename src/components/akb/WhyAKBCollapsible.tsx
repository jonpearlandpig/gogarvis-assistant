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
          "overflow-hidden transition-all duration-300",
          open ? "max-h-[720px] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
        )}
      >
        <div className="rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground">
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Most AI tools fail for predictable reasons: hallucinations, drift,
              generic answers, and overreach.
            </p>

            <p>
              GARVIS prevents that by aligning to your Authority Knowledge Base (AKB)
              first — your tone, deal breakers, strategic intent, and operating posture.
            </p>

            <p>
              Wherever you are on the AI spectrum—
            </p>

            <p>
              If you're early-stage with a handful of notes and rough ideas,
              GARVIS multiplies clarity.
            </p>

            <p>
              If you bring a full executive brief, financial model,
              go-to-market strategy, and years of operating history,
              GARVIS compounds leverage.
            </p>

            <p className="font-medium text-foreground">
              Same system. Different lift.
            </p>

            <div className="font-medium text-foreground">
              <span className="block">
                The bigger the WHAT (your AKB),
              </span>
              <span className="block">
                the bigger the WOW (GARVIS outputs).
              </span>
            </div>

            <p>
              You don't have to complete everything today.
              Lock each category when it feels right.
              Control stays with you.
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
