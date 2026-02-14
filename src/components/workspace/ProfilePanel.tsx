import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import type { UOPConfig, UOPVersion } from "@/hooks/useUserProfile";

interface Props {
  version: UOPVersion | null;
  profileName: string;
  onSave: (cfg: UOPConfig) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onClose: () => void;
}

const PHASES = ["SPARK", "BUILD", "LAUNCH", "EXPAND", "EVERGREEN", "SUNSET"];
const TONES = ["default", "direct", "academic", "casual", "strategic", "creative"];

const DEFAULT_FOCUS = { systems: 20, creative: 20, architect: 20, business: 20, risk: 20 };

export function ProfilePanel({ version, profileName, onSave, onRename, onClose }: Props) {
  const existing = version?.config_json;

  const [name, setName] = useState(profileName);
  const [phaseBias, setPhaseBias] = useState(existing?.phase_bias || "");
  const [objective, setObjective] = useState(existing?.objective || "");
  const [tone, setTone] = useState(existing?.tone || "default");
  const [riskReview, setRiskReview] = useState(existing?.include_risk_review ?? false);
  const [notes, setNotes] = useState(existing?.advanced_notes || "");
  const [focus, setFocus] = useState(existing?.garvis_lens || DEFAULT_FOCUS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profileName);
    if (version?.config_json) {
      const c = version.config_json;
      setPhaseBias(c.phase_bias || "");
      setObjective(c.objective || "");
      setTone(c.tone || "default");
      setRiskReview(c.include_risk_review ?? false);
      setNotes(c.advanced_notes || "");
      setFocus(c.garvis_lens || DEFAULT_FOCUS);
    }
  }, [version, profileName]);

  const setSlider = (key: keyof typeof focus, val: number) => {
    setFocus((prev) => ({ ...prev, [key]: val }));
  };

  const total = focus.systems + focus.creative + focus.architect + focus.business + focus.risk || 1;

  const handleSave = async () => {
    setSaving(true);
    if (name !== profileName) {
      await onRename(name);
    }
    await onSave({
      phase_bias: phaseBias || undefined,
      objective,
      tone,
      include_risk_review: riskReview,
      advanced_notes: notes || undefined,
      garvis_lens: focus,
    });
    setSaving(false);
  };

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="text-xs font-mono font-semibold">User Operating Profile</div>
          {version && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              v{version.version_number} • {version.telauthorium_id}
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Profile Name */}
        <div className="space-y-1.5">
          <Label className="text-xs">Profile Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this profile…"
            className="h-8 text-xs"
          />
        </div>

        {/* Phase Bias */}
        <div className="space-y-1.5">
          <Label className="text-xs">Phase Bias</Label>
          <Select value={phaseBias} onValueChange={setPhaseBias}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {PHASES.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Objective */}
        <div className="space-y-1.5">
          <Label className="text-xs">Objective</Label>
          <Input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="What are you working on?"
            className="h-8 text-xs"
          />
        </div>

        {/* Tone */}
        <div className="space-y-1.5">
          <Label className="text-xs">Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Risk Review */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Include Risk Review</Label>
          <Switch checked={riskReview} onCheckedChange={setRiskReview} />
        </div>

        {/* GARVIS Lens */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold">GARVIS Lens</Label>
          {(Object.keys(DEFAULT_FOCUS) as (keyof typeof DEFAULT_FOCUS)[]).map((key) => {
            const pct = Math.round((focus[key] / total) * 100);
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] capitalize text-muted-foreground">{key}</span>
                  <span className="text-[11px] font-mono text-foreground">{pct}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[focus[key]]}
                  onValueChange={([v]) => setSlider(key, v)}
                  className="h-1"
                />
              </div>
            );
          })}
        </div>

        {/* Advanced Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs">Advanced Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional context for GARVIS..."
            className="text-xs min-h-[60px]"
          />
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <Button onClick={handleSave} disabled={saving} size="sm" className="w-full text-xs">
          {saving ? "Saving…" : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}
