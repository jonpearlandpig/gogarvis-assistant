import { useState } from "react";
import { Layers, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AKB_TEMPLATES, type AKBTemplate } from "@/lib/akb-templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  conversationId: string | null;
  onApplyTemplate: (
    entries: { title: string; content: string; category: string; source_conversation_id?: string | null }[]
  ) => Promise<void>;
}

export function AKBTemplatePanel({ conversationId, onApplyTemplate }: Props) {
  const [selected, setSelected] = useState<AKBTemplate | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const handleApply = async (template: AKBTemplate) => {
    setApplying(true);
    try {
      const entries = template.entries.map((e) => ({
        title: e.title,
        content: e.content,
        category: e.category,
        source_conversation_id: conversationId,
      }));
      await onApplyTemplate(entries);
      setApplied((prev) => new Set(prev).add(template.id));
      setSelected(null);
    } finally {
      setApplying(false);
    }
  };

  if (selected) {
    return (
      <>
        <ScrollArea className="h-full p-2">
          <div className="px-2 py-1">
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-primary hover:underline font-mono mb-3"
            >
              ← All Templates
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{selected.icon}</span>
              <h3 className="text-sm font-semibold">{selected.name}</h3>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3">{selected.description}</p>
            <Badge variant="outline" className="text-[9px] font-mono mb-4">
              {selected.entries.length} entries
            </Badge>
          </div>

          <div className="space-y-1.5 px-1">
            {selected.entries.map((entry, i) => (
              <div
                key={i}
                className="rounded-md border border-border/50 bg-muted/20 px-3 py-2"
              >
                <p className="text-xs font-medium">{entry.title}</p>
                <Badge variant="outline" className="text-[8px] px-1 py-0 font-mono mt-1">
                  {entry.category}
                </Badge>
              </div>
            ))}
          </div>

          <div className="px-2 pt-4 pb-2">
            <Button
              size="sm"
              className="w-full text-xs font-mono"
              disabled={applying || applied.has(selected.id)}
              onClick={() => handleApply(selected)}
            >
              {applying ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Applying...
                </>
              ) : applied.has(selected.id) ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1.5" />
                  Applied
                </>
              ) : (
                "Apply Template to AKB"
              )}
            </Button>
            {!applied.has(selected.id) && (
              <p className="text-[9px] text-muted-foreground text-center mt-1.5">
                Creates {selected.entries.length} starter entries you can edit and build on.
              </p>
            )}
          </div>
        </ScrollArea>
      </>
    );
  }

  return (
    <ScrollArea className="h-full p-2">
      {AKB_TEMPLATES.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">
          No templates available yet.
        </p>
      ) : (
        <div className="space-y-1">
          {AKB_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setSelected(tpl)}
              className="w-full flex items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-muted/50 transition-colors group"
            >
              <span className="text-xl shrink-0">{tpl.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{tpl.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{tpl.description}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[8px] px-1 py-0 font-mono">
                    {tpl.industry}
                  </Badge>
                  <span className="text-[9px] text-muted-foreground">
                    {tpl.entries.length} entries
                  </span>
                  {applied.has(tpl.id) && (
                    <Badge variant="secondary" className="text-[8px] px-1 py-0">
                      Applied
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}
