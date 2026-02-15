import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Purpose = "Company / Studio" | "Single Project" | "Personal OS" | "Tour / Production";
type Mission = "Scale Revenue & Growth" | "Ship Product / Finish Creative" | "Protect IP & Assets" | "Reduce Chaos & Automate Ops";
type Tone = "Direct Operator" | "Executive Strategic" | "Creative Producer" | "Friendly Coach";

const PURPOSES: Purpose[] = ["Company / Studio", "Single Project", "Personal OS", "Tour / Production"];
const MISSIONS: Mission[] = ["Scale Revenue & Growth", "Ship Product / Finish Creative", "Protect IP & Assets", "Reduce Chaos & Automate Ops"];
const TONES: Tone[] = ["Direct Operator", "Executive Strategic", "Creative Producer", "Friendly Coach"];

function Pill({
  active,
  children,
  onClick,
  disabled,
}: {
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[11px] transition-colors",
        "border-border hover:bg-muted/40",
        active && "border-primary bg-primary/10 text-primary",
        disabled && "opacity-40 hover:bg-transparent cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

async function persistChoice(key: string, value: string) {
  const { error } = await supabase.rpc("akb_set_identity_choice" as any, {
    p_key: key,
    p_value: value,
  });
  if (error) throw error;
}

async function quickstartDrafts(source?: string) {
  const { error } = await supabase.rpc("akb_quickstart_identity" as any, {
    p_source: source ?? "identity_builder",
  });
  if (error) throw error;
}

export function IdentityTapLock({
  sourceLabel,
  onComplete,
}: {
  sourceLabel?: string;
  onComplete?: () => void;
}) {
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [tone, setTone] = useState<Tone | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);

  const allSet = !!purpose && !!mission && !!tone;

  const tap = async (key: "purpose" | "mission" | "tone", value: string) => {
    try {
      setBusyKey(key);
      if (key === "purpose") setPurpose(value as Purpose);
      if (key === "mission") setMission(value as Mission);
      if (key === "tone") setTone(value as Tone);
      await persistChoice(key, value);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setBusyKey(null);
    }
  };

  const createDrafts = async () => {
    if (!allSet) return;
    setDraftBusy(true);
    try {
      await quickstartDrafts(sourceLabel);
      toast.success("Identity drafts created");
      onComplete?.();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create drafts");
    } finally {
      setDraftBusy(false);
    }
  };

  const helper = useMemo(() => {
    if (!purpose) return "Pick what this system is for.";
    if (!mission) return "Pick the core mission.";
    if (!tone) return "Pick how GARVIS should talk.";
    return "Ready. Create drafts and continue.";
  }, [purpose, mission, tone]);

  return (
    <div className="rounded-2xl border border-border bg-background p-4 space-y-4">
      <div>
        <div className="text-xs font-semibold text-foreground">Identity Lock</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{helper}</div>
      </div>

      {/* Purpose */}
      <div>
        <div className="text-[11px] font-medium text-foreground mb-2">What is this for?</div>
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map((v) => (
            <Pill key={v} active={purpose === v} disabled={busyKey === "purpose"} onClick={() => tap("purpose", v)}>
              {v}
            </Pill>
          ))}
        </div>
      </div>

      {/* Mission */}
      <div>
        <div className="text-[11px] font-medium text-foreground mb-2">Core mission</div>
        <div className="flex flex-wrap gap-2">
          {MISSIONS.map((v) => (
            <Pill key={v} active={mission === v} disabled={!purpose || busyKey === "mission"} onClick={() => tap("mission", v)}>
              {v}
            </Pill>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div>
        <div className="text-[11px] font-medium text-foreground mb-2">Tone preset</div>
        <div className="flex flex-wrap gap-2">
          {TONES.map((v) => (
            <Pill key={v} active={tone === v} disabled={!purpose || !mission || busyKey === "tone"} onClick={() => tap("tone", v)}>
              {v}
            </Pill>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
          onClick={onComplete}
        >
          Skip
        </button>

        <button
          type="button"
          disabled={!allSet || draftBusy}
          onClick={createDrafts}
          className={cn(
            "rounded-full border px-4 py-2 text-xs transition-colors",
            "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10",
            (!allSet || draftBusy) && "opacity-40 hover:bg-primary/5 cursor-not-allowed"
          )}
        >
          {draftBusy ? "Working…" : "Quick Start: Create Drafts"}
        </button>
      </div>
    </div>
  );
}
