import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  "general",
  "project",
  "decision",
  "contact",
  "idea",
  "document",
  "code",
  "reference",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  onSave: (entry: {
    title: string;
    content: string;
    category: string;
    source_type?: "human" | "decision_object";
    source_conversation_id?: string | null;
  }) => Promise<any>;
}

export function SaveToAKBDialog({ open, onOpenChange, conversationId, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [sourceType, setSourceType] = useState<"human" | "decision_object">("human");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      content: content.trim(),
      category,
      source_type: sourceType,
      source_conversation_id: conversationId,
    });
    setSaving(false);
    setTitle("");
    setContent("");
    setCategory("general");
    setSourceType("human");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wider">
            Save to AKB
          </DialogTitle>
          <p className="text-[10px] text-muted-foreground font-mono">
            Append-only • Immutable • Telauthorium verified
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entry title..."
              className="bg-muted border-border text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Knowledge content (markdown supported)..."
              className="bg-muted border-border text-sm min-h-[120px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-muted border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-sm capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Source Type</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as any)}>
                <SelectTrigger className="bg-muted border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="human" className="text-sm">Human Authored</SelectItem>
                  <SelectItem value="decision_object" className="text-sm">Decision Object</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || !content.trim() || saving}
            className="text-xs font-mono"
          >
            {saving ? "Saving..." : "Authorize & Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
