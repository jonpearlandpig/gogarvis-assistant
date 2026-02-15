import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Zap, ListChecks, X } from "lucide-react";

interface Props {
  detectedDomain: string;
  detectedSource: string;
  onDismiss: () => void;
  onDraftsCreated?: () => void;
}

const OFFER_CHOICES = {
  type: {
    title: "1) Type",
    options: [
      "Full-Service Creative (Strategy + Execution)",
      "Production House",
      "Brand Identity / Design",
      "Consulting / Experience Design",
    ],
  },
  buyer: {
    title: "2) Primary Buyer",
    options: [
      "High-growth Startups",
      "Enterprise / Lifestyle Brands",
      "Artists / Visionaries",
      "Internal Projects",
    ],
  },
  pricing: {
    title: "3) Pricing",
    options: [
      "Premium / Bespoke",
      "Mid-market / Project",
      "Retainer / Partnership",
    ],
  },
};

type Phase = "pick" | "drafts_done" | "choices" | "done";

export function AKBNextStepsCard({
  detectedDomain,
  detectedSource,
  onDismiss,
  onDraftsCreated,
}: Props) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [busy, setBusy] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const handleQuickStart = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("akb_quickstart_offer", {
        p_source: detectedSource,
      });
      if (error) throw error;
      toast.success("Created 2 Offer drafts");
      setPhase("drafts_done");
      onDraftsCreated?.();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create drafts");
    } finally {
      setBusy(false);
    }
  };

  const handleChoice = async (key: string, value: string) => {
    const next = { ...selections, [key]: value };
    setSelections(next);

    try {
      await supabase.rpc("akb_set_offer_choice", {
        p_key: key,
        p_value: value,
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to save choice");
    }
  };

  const allChosen = selections.type && selections.buyer && selections.pricing;

  // ── Pick phase ──
  if (phase === "pick") {
    return (
      <div className="border border-primary/20 rounded-lg bg-card p-4 space-y-3 text-sm max-w-md">
        <div className="font-mono text-xs text-primary tracking-wider">GARVIS</div>
        <p className="text-foreground">
          I found enough signal to start building your AKB.
        </p>
        <p className="text-muted-foreground text-xs">
          Detected focus: <span className="font-semibold text-foreground uppercase">{detectedDomain}</span>{" "}
          (what you sell + who it's for) from{" "}
          <span className="text-foreground">{detectedSource}</span>.
        </p>
        <div className="text-xs text-muted-foreground font-medium pt-1">Pick the fastest path:</div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleQuickStart}
            disabled={busy}
            className="flex items-center gap-2 text-left px-3 py-2 rounded border border-primary/30 bg-primary/5 text-foreground text-xs hover:bg-primary/10 hover:border-primary/50 transition-colors disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
            Quick Start: Create Offer Drafts (2)
          </button>
          <button
            onClick={() => setPhase("choices")}
            className="flex items-center gap-2 text-left px-3 py-2 rounded border border-border text-foreground text-xs hover:bg-muted/40 transition-colors"
          >
            <ListChecks className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            Answer 3 Choices (30 sec)
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center gap-2 text-left px-3 py-2 rounded border border-border text-muted-foreground text-xs hover:bg-muted/40 transition-colors"
          >
            <X className="h-3.5 w-3.5 shrink-0" />
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // ── Drafts done phase ──
  if (phase === "drafts_done") {
    return (
      <div className="border border-primary/20 rounded-lg bg-card p-4 space-y-3 text-sm max-w-md">
        <div className="font-mono text-xs text-primary tracking-wider">GARVIS</div>
        <p className="text-foreground flex items-center gap-2">
          <Check className="h-4 w-4 text-primary" /> Created (2 drafts)
        </p>
        <ul className="text-xs text-muted-foreground space-y-1 pl-4">
          <li>Offer → "Pearl & Pig Core Services"</li>
          <li>Offer → "Target Client Profile"</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Next: Confirm 3 choices to tighten it (optional).
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setPhase("choices")}
            className="px-3 py-1.5 rounded border border-primary/30 bg-primary/5 text-xs text-foreground hover:bg-primary/10 transition-colors"
          >
            Set Type
          </button>
          <button
            onClick={() => setPhase("choices")}
            className="px-3 py-1.5 rounded border border-primary/30 bg-primary/5 text-xs text-foreground hover:bg-primary/10 transition-colors"
          >
            Set Buyer
          </button>
          <button
            onClick={() => setPhase("choices")}
            className="px-3 py-1.5 rounded border border-primary/30 bg-primary/5 text-xs text-foreground hover:bg-primary/10 transition-colors"
          >
            Set Pricing
          </button>
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Choices phase ──
  if (phase === "choices") {
    return (
      <div className="border border-primary/20 rounded-lg bg-card p-4 space-y-4 text-sm max-w-lg">
        <div className="font-mono text-xs text-primary tracking-wider">GARVIS — Offer Setup</div>

        {Object.entries(OFFER_CHOICES).map(([key, card]) => (
          <div key={key} className="space-y-1.5">
            <div className="text-xs font-medium text-foreground">{card.title}</div>
            <div className="flex flex-wrap gap-1.5">
              {card.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleChoice(key, opt)}
                  className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                    selections[key] === opt
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          {allChosen && (
            <button
              onClick={() => {
                toast.success("Offer choices saved");
                onDismiss();
                onDraftsCreated?.();
              }}
              className="px-3 py-1.5 rounded border border-primary/30 bg-primary/5 text-xs text-foreground hover:bg-primary/10 transition-colors flex items-center gap-1.5"
            >
              <Check className="h-3 w-3" /> Done
            </button>
          )}
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return null;
}
