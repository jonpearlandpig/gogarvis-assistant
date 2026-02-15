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
        <span className="font-mono truncate">goGarvis?</span>
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
            <p className="font-medium text-foreground">
              What actually happens when you say "goGarvis"?
            </p>

            <p>
              When you say "goGarvis," you're not asking a chatbot.
              You're activating a system that works from your Authority Knowledge Base (AKB).
            </p>

            <p>
              Most AI tools guess. They hallucinate. They drift.
              They give generic answers because they don't truly know you.
            </p>

            <p>
              GARVIS is different.
              It does not start with output.
              It starts with alignment.
            </p>

            <p>
              Your AKB defines your tone, deal breakers, strategic intent,
              operating posture, and patterns.
              GARVIS then works inside those boundaries.
            </p>

            <p>
              Early-stage founder with a few notes?
              GARVIS multiplies clarity.
            </p>

            <p>
              10-year operator with financials, GTM strategy, inventory,
              and operating history?
              GARVIS compounds leverage.
            </p>

            <p className="font-medium text-foreground">
              Same system. Different lift.
            </p>

            <div className="font-medium text-foreground">
              <span className="block">The bigger the WHAT (your AKB),</span>
              <span className="block">the bigger the WOW (GARVIS output).</span>
            </div>

            <p>
              GARVIS doesn't replace you.
              It amplifies you.
            </p>

            <p>
              You build the space.
              GARVIS works inside it.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => onStartBuilding?.()}
              className="w-full sm:w-auto rounded-full border border-border px-5 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors"
            >
              Start Building My AKB
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
