// src/components/workspace/AKBProgressTLDR.tsx
import { useMemo } from "react";
import { BuilderCard } from "@/components/builders/BuilderCard";
import { getTopBuilders, type BuilderAction, type BuilderContext } from "@/lib/builders-registry";

type DomainKey = "identity" | "goals" | "offer" | "audience" | "assets" | "financial_model";

export function AKBProgressTLDR({
  progress,
  hasFirstDataset,
  workspaceUnlocked,
  onOpenBuilder,
  onOpenGuide,
  onCreateArtifact,
  onSendChat,
  className,
}: {
  progress: any;
  hasFirstDataset: boolean;
  workspaceUnlocked: boolean;
  onOpenBuilder: (step: DomainKey) => void;
  onOpenGuide: () => void;
  onCreateArtifact: () => void;
  onSendChat: (msg: string) => void;
  className?: string;
}) {
  const { headline, sub, builders } = useMemo(() => {
    if (!progress) {
      return { headline: "GARVIS", sub: "Loading your system status…", builders: [] as any[] };
    }

    const coveragePercent = progress.coveragePercent ?? 0;
    const lockedDomains =
      (progress.domains || []).filter((d: any) => d.locked).map((d: any) => d.domain_key);

    const ctx: BuilderContext = { hasFirstDataset, workspaceUnlocked, coveragePercent, lockedDomains };

    const headline = coveragePercent >= 80 ? "Workspace Ready" : "Build Your System";
    const sub =
      coveragePercent >= 80
        ? "Your foundation is strong enough to run projects safely."
        : `System clarity: ${coveragePercent}%. Choose a QuickStart to move forward.`;

    return { headline, sub, builders: getTopBuilders(ctx, 3) };
  }, [progress, hasFirstDataset, workspaceUnlocked]);

  const exec = (action: BuilderAction) => {
    if (action.type === "open_builder") return onOpenBuilder(action.step as DomainKey);
    if (action.type === "create_artifact") return onCreateArtifact();
    if (action.type === "send_chat") return onSendChat(action.message);
  };

  return (
    <div className={className}>
      <div className="rounded-2xl border border-border bg-muted/10 p-4">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">GARVIS TL;DR</div>
        <div className="mt-1 text-sm font-medium text-foreground">{headline}</div>
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>

        <div className="mt-3 grid gap-3">
          {builders.map((b) => (
            <BuilderCard key={b.id} builder={b} onStart={() => exec(b.primaryAction)} onSkip={onOpenGuide} />
          ))}

          {builders.length === 0 && (
            <button
              onClick={onOpenGuide}
              className="w-full rounded-xl border border-border px-3 py-2 text-left text-xs hover:bg-muted/30 transition-colors"
            >
              What should I do next?
              <div className="mt-1 text-[11px] text-muted-foreground">GARVIS will guide without guessing.</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
