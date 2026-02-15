import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  detectedDomain: string;
  detectedSource?: string | null;
  onDismiss: () => void;
  onDraftsCreated?: () => void;
};

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
    options: ["Premium / Bespoke", "Mid-market / Project", "Retainer / Partnership"],
  },
} as const;

type Phase = "pick" | "drafts_done" | "choices";

export function AKBNextStepsCard({
  detectedDomain,
  detectedSource,
  onDismiss,
  onDraftsCreated,
}: Props) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [busy, setBusy] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const isOffer = detectedDomain === "offer";
  const allChosen = Boolean(selections.type && selections.buyer && selections.pricing);

  const handleQuickStart = async () => {
    if (!isOffer) {
      toast.message("Quick Start is not available for this domain yet.");
      setPhase("choices");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.rpc("akb_quickstart_offer", {
        p_source: detectedSource ?? null,
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

    if (!isOffer) return;

    try {
      const { error } = await supabase.rpc("akb_set_offer_choice", {
        p_key: key,
        p_value: value,
      });
      if (error) throw error;
    } catch (e: any) {
      toast.error(e?.message || "Failed to save choice");
    }
  };

  const header = useMemo(() => {
    const d = (detectedDomain || "").toUpperCase();
    return `Detected focus: ${d}`;
  }, [detectedDomain]);

  // ── Pick phase ──
  if (phase === "pick") {
    return (
      <div className="rounded-2xl border border-border bg-muted/10 p-4">
        <div className="text-xs font-medium text-foreground">GARVIS</div>
        <div className="mt-1 text-sm text-foreground">
          I found enough signal to start building your AKB.
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {header}
          {detectedSource ? (
            <>
              {" "}from <span className="text-foreground/80">{detectedSource}</span>
            </>
          ) : null}
        </div>

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={handleQuickStart}
            disabled={busy}
            className={cn(
              "w-full rounded-xl border border-border px-3 py-2 text-left text-xs transition-colors",
              "hover:bg-muted/30 disabled:opacity-50"
            )}
          >
            Quick Start: Create {isOffer ? "Offer" : "Domain"} Drafts
          </button>

          <button
            type="button"
            onClick={() => setPhase("choices")}
            className="w-full rounded-xl border border-border px-3 py-2 text-left text-xs text-foreground hover:bg-muted/30 transition-colors"
          >
            Answer 3 Choices (30 sec)
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-xl border border-border px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // ── Drafts done phase ──
  if (phase === "drafts_done") {
    return (
      <div className="rounded-2xl border border-border bg-muted/10 p-4">
        <div className="text-xs font-medium text-foreground">GARVIS</div>
        <div className="mt-2 text-sm text-foreground">Created (2 drafts)</div>
        <div className="mt-2 text-xs text-muted-foreground space-y-1">
          <div>Offer → "Pearl &amp; Pig Core Services"</div>
          <div>Offer → "Target Client Profile"</div>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Optional: confirm 3 choices to tighten it.
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPhase("choices")}
            className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted/30 transition-colors"
          >
            Set Type / Buyer / Pricing
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Choices phase ──
  return (
    <div className="rounded-2xl border border-border bg-muted/10 p-4">
      <div className="text-xs font-medium text-foreground">GARVIS — Offer Setup</div>

      <div className="mt-3 space-y-4">
        {Object.entries(OFFER_CHOICES).map(([key, card]) => (
          <div key={key}>
            <div className="text-xs text-foreground">{card.title}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {card.options.map((opt) => {
                const active = selections[key] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleChoice(key, opt)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
        >
          Skip
        </button>

        <button
          type="button"
          disabled={!allChosen}
          onClick={() => {
            toast.success("Saved");
            onDraftsCreated?.();
            onDismiss();
          }}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition-colors",
            allChosen
              ? "border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15"
              : "border-border text-muted-foreground opacity-50"
          )}
        >
          Done
        </button>
      </div>
    </div>
  );
}
