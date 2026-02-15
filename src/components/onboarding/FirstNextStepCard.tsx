export function FirstNextStepCard({
  onTry,
  onBuild,
  onUpload,
  onLink,
}: {
  onTry: () => void;
  onBuild: () => void;
  onUpload: () => void;
  onLink: () => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-background p-4">
      <div className="text-xs text-muted-foreground">GARVIS</div>
      <div className="mt-1 text-base font-semibold text-foreground">
        Choose your next step
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        No typing. Tap a path and I'll guide start → work → finish → next.
      </div>

      <div className="mt-3 grid gap-2">
        <button
          onClick={onTry}
          className="w-full rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted/30 transition-colors"
        >
          <div className="font-medium text-foreground">Should I try it?</div>
          <div className="text-xs text-muted-foreground">
            Fast demo mode. Minimal setup. Learn by using.
          </div>
        </button>

        <button
          onClick={onBuild}
          className="w-full rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted/30 transition-colors"
        >
          <div className="font-medium text-foreground">Should I build it?</div>
          <div className="text-xs text-muted-foreground">
            Full AKB build. Strong system foundation for real work.
          </div>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onUpload}
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          Upload a doc
        </button>
        <button
          onClick={onLink}
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          Add a website link
        </button>
      </div>
    </div>
  );
}
