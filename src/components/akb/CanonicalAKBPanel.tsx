import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CanonicalData } from "@/lib/scoped-akb";

interface Props {
  data: CanonicalData | null;
  onSave: (data: Partial<CanonicalData>) => void;
}

export function CanonicalAKBPanel({ data, onSave }: Props) {
  const [tone, setTone] = useState(data?.tone_profile || "");
  const [commStyle, setCommStyle] = useState(data?.communication_style || "");
  const [pricing, setPricing] = useState(data?.pricing_posture || "");
  const [risk, setRisk] = useState(data?.risk_profile || "");
  const [philosophy, setPhilosophy] = useState(data?.decision_philosophy || "");
  const [dealBreakers, setDealBreakers] = useState(data?.deal_breakers?.join("\n") || "");
  const [intent, setIntent] = useState(data?.strategic_intent || "");

  useEffect(() => {
    setTone(data?.tone_profile || "");
    setCommStyle(data?.communication_style || "");
    setPricing(data?.pricing_posture || "");
    setRisk(data?.risk_profile || "");
    setPhilosophy(data?.decision_philosophy || "");
    setDealBreakers(data?.deal_breakers?.join("\n") || "");
    setIntent(data?.strategic_intent || "");
  }, [data]);

  const handleSave = () => {
    onSave({
      tone_profile: tone || null,
      communication_style: commStyle || null,
      pricing_posture: pricing || null,
      risk_profile: risk || null,
      decision_philosophy: philosophy || null,
      deal_breakers: dealBreakers.split("\n").map((s) => s.trim()).filter(Boolean),
      strategic_intent: intent || null,
    });
  };

  const fieldClass =
    "w-full rounded border border-border bg-background px-2 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40";

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-3 p-3">
        <div className="text-xs font-mono text-foreground uppercase tracking-wide">
          Canonical AKB
        </div>
        <div className="text-[10px] text-muted-foreground">
          Immutable identity layer — tone, deal breakers, and strategic intent always override project context.
        </div>

        <label className="block">
          <span className="text-[10px] text-muted-foreground">Tone & Voice</span>
          <textarea className={fieldClass} rows={2} value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. Direct, confident, no fluff" />
        </label>

        <label className="block">
          <span className="text-[10px] text-muted-foreground">Communication Style</span>
          <textarea className={fieldClass} rows={2} value={commStyle} onChange={(e) => setCommStyle(e.target.value)} placeholder="e.g. Structured bullet points, concise" />
        </label>

        <label className="block">
          <span className="text-[10px] text-muted-foreground">Pricing Posture</span>
          <input className={fieldClass} value={pricing} onChange={(e) => setPricing(e.target.value)} placeholder="e.g. Premium, value-based" />
        </label>

        <label className="block">
          <span className="text-[10px] text-muted-foreground">Risk Profile</span>
          <input className={fieldClass} value={risk} onChange={(e) => setRisk(e.target.value)} placeholder="e.g. Conservative, calculated risk-taker" />
        </label>

        <label className="block">
          <span className="text-[10px] text-muted-foreground">Decision Philosophy</span>
          <textarea className={fieldClass} rows={2} value={philosophy} onChange={(e) => setPhilosophy(e.target.value)} placeholder="e.g. Data-driven, founder has final say" />
        </label>

        <label className="block">
          <span className="text-[10px] text-muted-foreground">Deal Breakers (one per line)</span>
          <textarea className={fieldClass} rows={3} value={dealBreakers} onChange={(e) => setDealBreakers(e.target.value)} placeholder="No hallucinations&#10;No brand drift&#10;No unapproved publishing" />
        </label>

        <label className="block">
          <span className="text-[10px] text-muted-foreground">Strategic Intent</span>
          <textarea className={fieldClass} rows={2} value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="e.g. Scale to $1M ARR in 12 months" />
        </label>

        <button
          onClick={handleSave}
          className="w-full text-xs border border-border rounded py-2 hover:bg-muted/40 text-foreground transition-colors"
        >
          Save Canonical
        </button>
      </div>
    </ScrollArea>
  );
}
