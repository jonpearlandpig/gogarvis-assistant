import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onEnter: () => void;
  onStartProject: () => void;
}

export function FoundationUnlockOverlay({
  open,
  onEnter,
  onStartProject,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <h2 className="text-2xl font-semibold text-foreground">
          You built your system.
        </h2>

        <div className="text-sm text-muted-foreground space-y-2">
          <p>Your tone and deal breakers are locked.</p>
          <p>Your projects now run with your rules.</p>
          <p>Artifacts turn outputs into real files.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onEnter}>
            Enter Workspace
          </Button>
          <Button variant="outline" onClick={onStartProject}>
            Start Project 01
          </Button>
        </div>
      </div>
    </div>
  );
}
