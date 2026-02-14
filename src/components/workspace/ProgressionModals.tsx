import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GARVIS_UI } from "@/lib/garvis-ui-strings";

function ModalShell({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80" onClick={onClose} />
      <div className="relative w-[92vw] max-w-xl rounded-xl border border-border bg-background shadow-xl">
        {children}
      </div>
    </div>
  );
}

// ─── Foundation Complete ─────────────────────────────────
export function FoundationCompleteModal({
  open,
  onEnter,
}: {
  open: boolean;
  onEnter: () => void;
}) {
  return (
    <ModalShell open={open} onClose={() => {}}>
      <div className="p-6">
        <div className="text-sm font-medium">{GARVIS_UI.foundationComplete.title}</div>
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          {GARVIS_UI.foundationComplete.body.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button onClick={onEnter} className="text-xs underline">
            {GARVIS_UI.foundationComplete.cta}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Workspace Reveal ────────────────────────────────────
export function WorkspaceRevealModal({
  open,
  onDone,
}: {
  open: boolean;
  onDone: () => void;
}) {
  return (
    <ModalShell open={open} onClose={() => {}}>
      <div className="p-6">
        <div className="text-sm font-medium">{GARVIS_UI.workspaceReveal.title}</div>

        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          {GARVIS_UI.workspaceReveal.bullets.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-foreground">•</span>
              <span>{b}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button onClick={onDone} className="text-xs underline">
            Continue
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─── Operator Mode Banner ────────────────────────────────
export function OperatorModeBanner({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="w-full border-b border-border bg-muted/40 px-4 py-3 text-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium">{GARVIS_UI.operatorMode.bannerTitle}</div>
          <div className="text-muted-foreground">{GARVIS_UI.operatorMode.bannerBody}</div>

          <div className="mt-2 text-muted-foreground">{GARVIS_UI.operatorMode.unlocksLabel}</div>
          <div className="mt-1 text-muted-foreground">
            {GARVIS_UI.operatorMode.unlocks.map((u, i) => (
              <div key={i}>• {u}</div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => {
              toast.success("Unlocked: Operator Mode");
              onClose();
            }}
            className="text-xs underline"
          >
            {GARVIS_UI.operatorMode.cta}
          </button>
          <button onClick={onClose} className="text-xs text-muted-foreground underline">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sovereign Rename ────────────────────────────────────
export function SovereignRenameModal({
  open,
  currentName,
  onSave,
  onClose,
}: {
  open: boolean;
  currentName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName);

  useEffect(() => setName(currentName), [currentName]);

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="p-6">
        <div className="text-sm font-medium">{GARVIS_UI.sovereignMode.title}</div>
        <div className="mt-2 text-sm text-muted-foreground">{GARVIS_UI.sovereignMode.body}</div>

        <div className="mt-4 text-sm text-muted-foreground">
          {GARVIS_UI.sovereignMode.capabilitiesLabel}
        </div>
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          {GARVIS_UI.sovereignMode.capabilities.map((c, i) => (
            <div key={i}>• {c}</div>
          ))}
        </div>

        <div className="mt-6">
          <div className="mb-1 text-xs text-muted-foreground">{GARVIS_UI.renameScreen.title}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-muted px-3 text-sm"
            placeholder="Enter a name..."
            maxLength={32}
          />
          <div className="mt-2 text-xs text-muted-foreground">{GARVIS_UI.renameScreen.subtitle}</div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-4">
          <button onClick={onClose} className="text-xs underline text-muted-foreground">
            Not now
          </button>
          <button
            onClick={() => {
              const trimmed = name.trim();
              if (!trimmed) return;
              onSave(trimmed);
            }}
            className="text-xs underline"
          >
            {GARVIS_UI.sovereignMode.cta}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
