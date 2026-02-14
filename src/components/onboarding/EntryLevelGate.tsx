import garvisLogo from "@/assets/garvis_logo_white.png";

type Props = {
  open: boolean;
  onChoose: (level: "getting_started" | "already_building") => void;
};

export function EntryLevelGate({ open, onChoose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
      <div className="w-full max-w-md space-y-6 px-6">
        <div className="flex justify-center mb-2">
          <img src={garvisLogo} alt="goGARVIS" className="h-10" />
        </div>
        <h1 className="text-xl font-semibold text-foreground text-center">
          Choose your entry level
        </h1>
        <p className="text-xs text-muted-foreground text-center">
          Lift the learner. Launch the leader.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onChoose("getting_started")}
            className="w-full text-left rounded-lg border border-border p-4 hover:bg-muted/40 transition-colors"
          >
            <div className="text-sm font-medium text-foreground">Getting started</div>
            <div className="text-xs text-muted-foreground mt-1">
              Guided foundation build. One step at a time.
            </div>
          </button>

          <button
            onClick={() => onChoose("already_building")}
            className="w-full text-left rounded-lg border border-border p-4 hover:bg-muted/40 transition-colors"
          >
            <div className="text-sm font-medium text-foreground">Already building</div>
            <div className="text-xs text-muted-foreground mt-1">
              Bulk upload docs + add websites. GARVIS drafts your AKB for approval.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
