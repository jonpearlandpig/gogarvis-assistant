import { useMemo } from "react";
import { cn } from "@/lib/utils";

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
  onOpenBuilder: (step: DomainKey) => void;
  onOpenGuide: () => void;
  onCreateDrafts?: (domain: DomainKey) => void;
  onCreateArtifact?: () => void;
  className?: string;
};

const LABELS: Record<string, string> = {
  identity: "Identity",
  goals: "Goals",
  offer: "Offer",
  audience: "Audience",
  assets: "Assets",
  financial_model: "Financial Model",
};

type Action = {
  kind: "unlock" | "lock" | "next" | "draft" | "quickstart" | "explore";
  title: string;
  sub?: string;
  onClick: () => void;
};

function pickTop3(actions: Action[]) {
  const score = (a: Action) =>
    a.kind === "unlock" ? 100 :
    a.kind === "lock" ? 90 :
    a.kind === "next" ? 80 :
    a.kind === "draft" ? 70 :
    a.kind === "quickstart" ? 65 :
    10;
  return [...actions].sort((a, b) => score(b) - score(a)).slice(0, 3);
}

export function AKBProgressTLDR({
  progress,
  workspaceUnlocked,
  onOpenBuilder,
  onOpenGuide,
  onCreateDrafts,
  onCreateArtifact,
  className,
}: Props) {
  const tldr = useMemo(() => {
    if (!progress) {
      return {
        headline: "GARVIS",
        sub: "Loading your system status…",
        actions: [] as Action[],
      };
    }

    const { coveragePercent, lockable, nextDomain, domains } = progress;
    const hasAnyDraft = domains.some((d) => d.status === "draft");
    const hasLockable = lockable.length > 0;

    const headline =
      coveragePercent >= 80 ? "Workspace Ready" : "Build Your System";
    const sub =
      coveragePercent >= 80
        ? "Your AKB foundation is strong enough to run projects safely."
        : `AKB coverage is ${coveragePercent}%. Raise clarity to unlock more power.`;

    const actions: Action[] = [];

    if (!workspaceUnlocked && coveragePercent < 80) {
      if (hasLockable) {
        const d = lockable[0];
        actions.push({
          kind: "lock",
          title: `Lock ${LABELS[d] || d}`,
          sub: "Locks your rules so GARVIS can enforce them.",
          onClick: () => onOpenGuide(),
        });
      }

      if (nextDomain) {
        if (nextDomain === "offer" && onCreateDrafts) {
          actions.push({
            kind: "quickstart",
            title: "Quick Start Offer (auto-drafts)",
            sub: "One click → creates drafts you can approve/edit.",
            onClick: () => onCreateDrafts("offer"),
          });
        }

        actions.push({
          kind: "next",
          title: `Build ${LABELS[nextDomain] || nextDomain} Next`,
          sub: "Opens the builder on the exact step.",
          onClick: () => onOpenBuilder(nextDomain as DomainKey),
        });
      }

      if (hasAnyDraft) {
        actions.push({
          kind: "draft",
          title: "Review drafts ready for approval",
          sub: "Fast approvals boost coverage immediately.",
          onClick: () => onOpenBuilder((nextDomain ?? "identity") as DomainKey),
        });
      }

      actions.push({
        kind: "explore",
        title: "Show me the safest next step",
        sub: "GARVIS will guide without guessing.",
        onClick: () => onOpenGuide(),
      });

      return { headline, sub, actions: pickTop3(actions) };
    }

    // Unlocked
    actions.push({
      kind: "unlock",
      title: "Create your first Artifact",
      sub: "Turn outputs into real files (docs, PDFs, sheets).",
      onClick: () => onCreateArtifact?.(),
    });

    if (hasLockable) {
      const d = lockable[0];
      actions.push({
        kind: "lock",
        title: `Lock ${LABELS[d] || d}`,
        sub: "Tightens enforcement as you scale.",
        onClick: () => onOpenGuide(),
      });
    }

    if (nextDomain) {
      actions.push({
        kind: "next",
        title: `Strengthen ${LABELS[nextDomain] || nextDomain}`,
        sub: "Adds clarity → increases lift.",
        onClick: () => onOpenBuilder(nextDomain as DomainKey),
      });
    }

    actions.push({
      kind: "explore",
      title: "What can I do right now?",
      sub: "GARVIS will route you to the best action.",
      onClick: () => onOpenGuide(),
    });

    return { headline, sub, actions: pickTop3(actions) };
  }, [progress, workspaceUnlocked, onOpenBuilder, onOpenGuide, onCreateDrafts, onCreateArtifact]);

  return (
    <div className={cn("rounded-2xl border border-border bg-muted/10 p-4", className)}>
      <div className="text-xs font-medium text-foreground">GARVIS TL;DR</div>
      <div className="mt-1 text-sm text-foreground">{tldr.headline}</div>
      <div className="mt-1 text-xs text-muted-foreground">{tldr.sub}</div>

      <div className="mt-3 grid gap-2">
        {tldr.actions.map((a) => (
          <button
            key={a.title}
            type="button"
            onClick={a.onClick}
            className="w-full rounded-xl border border-border px-3 py-2 text-left text-xs hover:bg-muted/30 transition-colors"
          >
            <div className="text-foreground">{a.title}</div>
            {a.sub ? <div className="mt-0.5 text-muted-foreground">{a.sub}</div> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
