import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import garvisLogo from "@/assets/garvis_logo_black.png";
import {
  getMomentumState,
  getMomentumScreen,
  type MomentumContext,
} from "@/lib/momentum-state";

interface Props {
  ctx: MomentumContext;
  onAction: (action: string) => void;
}

export function MomentumScreen({ ctx, onAction }: Props) {
  const screen = useMemo(() => {
    const state = getMomentumState(ctx);
    return getMomentumScreen(state, ctx.coveragePercent);
  }, [ctx]);

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={garvisLogo} alt="GARVIS" className="h-16 md:h-20" />
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
            {screen.headline}
          </h1>
          <p className="text-sm text-muted-foreground">{screen.subtext}</p>
        </div>

        {/* Primary Action */}
        <Button
          size="lg"
          className="w-full text-base font-medium"
          onClick={() => onAction(screen.primaryAction)}
        >
          {screen.primaryLabel}
        </Button>

        {/* Secondary Actions */}
        <div className="flex flex-col gap-2">
          {screen.secondaryActions.map((s) => (
            <button
              key={s.action}
              onClick={() => onAction(s.action)}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
