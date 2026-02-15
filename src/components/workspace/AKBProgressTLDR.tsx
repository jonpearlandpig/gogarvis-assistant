import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { BuilderCard } from "@/components/builders/BuilderCard";
import { getTopBuilders, type BuilderContext, type BuilderDef, type BuilderAction } from "@/lib/builders-registry";

type DomainKey =
  | "identity"
  | "goals"
  | "offer"
  | "audience"
  | "assets"
  | "financial_model";

type DomainRow = {
  domain_key: string;
  status: "empty" | "draft" | "complete";
  min_met: boolean;
  locked: boolean;
};

type Progress = {
  coveragePercent: number;
  completedCount: number;
  total: number;
  nextDomain: string | null;
  lockable: string[];
  domains: DomainRow[];
};

type Props = {
  progress: Progress | null;
  workspaceUnlocked: boolean;
  hasFirstDataset?: boolean;
  onOpenBuilder: (step: DomainKey) => void;
  onOpenGuide: () => void;
  onCreateDrafts?: (domain: DomainKey) => void;
  onCreateArtifact?: () => void;
  onSendChat?: (message: string) => void;
  className?: string;
};

export function AKBProgressTLDR({
  progress,
  workspaceUnlocked,
  hasFirstDataset = true,
  onOpenBuilder,
  onOpenGuide,
  onCreateDrafts,
  onCreateArtifact,
  onSendChat,
  className,
}: Props) {
  const { headline, sub, builders } = useMemo(() => {
    if (!progress) {
      return {
        headline: "GARVIS",
        sub: "Loading your system status…",
        builders: [] as BuilderDef[],
      };
    }

    const { coveragePercent, domains } = progress;

    const ctx: BuilderContext = {
      coveragePercent,
      completedDomains: domains.filter((d) => d.status === "complete").map((d) => d.domain_key),
      lockedDomains: domains.filter((d) => d.locked).map((d) => d.domain_key),
      lockableDomains: (progress.lockable || []) as string[],
      nextDomain: progress.nextDomain,
      hasFirstDataset,
      workspaceUnlocked,
      hasDrafts: domains.some((d) => d.status === "draft"),
    };

    const headline =
      coveragePercent >= 80 ? "Workspace Ready" : "Build Your System";
    const sub =
      coveragePercent >= 80
        ? "Your foundation is strong enough to run projects safely."
        : `System clarity: ${coveragePercent}%. Complete builders to unlock more power.`;

    return {
      headline,
      sub,
      builders: getTopBuilders(ctx, 3),
    };
  }, [progress, workspaceUnlocked, hasFirstDataset]);

  const executeAction = (action: BuilderAction) => {
    switch (action.type) {
      case "open_builder":
        onOpenBuilder(action.step as DomainKey);
        return;
      case "open_guide":
        onOpenGuide();
        return;
      case "create_artifact":
        onCreateArtifact?.();
        return;
      case "send_chat":
        onSendChat?.(action.message);
        return;
      case "rpc":
        return;
    }
  };

  return (
    <div className={cn("rounded-2xl border border-border bg-muted/10 p-4", className)}>
      <div className="text-xs font-medium text-foreground">GARVIS TL;DR</div>
      <div className="mt-1 text-sm text-foreground">{headline}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>

      {builders.length > 0 && (
        <div className="mt-3 grid gap-2">
          {builders.map((b) => (
            <BuilderCard
              key={b.id}
              builder={b}
              onStart={() => executeAction(b.primaryAction)}
              onSkip={() => onOpenGuide()}
            />
          ))}
        </div>
      )}

      {builders.length === 0 && (
        <button
          type="button"
          onClick={() => onOpenGuide()}
          className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-left text-xs hover:bg-muted/30 transition-colors"
        >
          <div className="text-foreground">What should I do next?</div>
          <div className="mt-0.5 text-muted-foreground">GARVIS will guide without guessing.</div>
        </button>
      )}
    </div>
  );
}
