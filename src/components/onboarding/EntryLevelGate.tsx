import garvisLogo from "@/assets/garvis_logo_white.png";
import GarvisEntryGate from "./GarvisEntryGate";

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

        {/* Two-Door Entry */}
        <GarvisEntryGate
          onTry={() => onChoose("getting_started")}
          onBuild={() => onChoose("already_building")}
        />
      </div>
    </div>
  );
}
