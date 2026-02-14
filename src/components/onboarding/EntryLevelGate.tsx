import garvisLogo from "@/assets/garvis_logo_white.png";

type Props = {
  open: boolean;
  onChoose: (level: "getting_started" | "already_building") => void;
};

export function EntryLevelGate({ open, onChoose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-3xl text-center space-y-10">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={garvisLogo} alt="goGARVIS" className="h-20 md:h-28" />
        </div>

        {/* Tagline */}
        <div className="text-lg md:text-xl text-muted-foreground">
          Lift the learner. Launch the leader.
        </div>

        {/* Entry Options */}
        <div className="space-y-4 pt-4">
          <button
            onClick={() => onChoose("getting_started")}
            className="w-full text-left rounded-xl border border-border p-6 hover:bg-muted/40 transition-colors"
          >
            <div className="text-lg font-semibold text-foreground">
              Getting started
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Guided foundation build. One step at a time.
            </div>
          </button>

          <button
            onClick={() => onChoose("already_building")}
            className="w-full text-left rounded-xl border border-border p-6 hover:bg-muted/40 transition-colors"
          >
            <div className="text-lg font-semibold text-foreground">
              Already building
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Bulk upload docs + add websites. GARVIS drafts your AKB for approval.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
