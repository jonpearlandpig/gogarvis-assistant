import { useState } from "react";
import { Database, Shield, Clock, Plus, ChevronRight, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAKB, type AKBEntry, type LedgerEntry } from "@/hooks/useAKB";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SaveToAKBDialog } from "./SaveToAKBDialog";
import { AKBTemplatePanel } from "./AKBTemplatePanel";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Props {
  conversationId: string | null;
}

export function AKBPanel({ conversationId }: Props) {
  const { entries, ledger, loading, addEntry } = useAKB();
  const [selected, setSelected] = useState<AKBEntry | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  if (selected) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={() => setSelected(null)} className="text-xs text-primary hover:underline font-mono">
            ← Back
          </button>
          <Badge variant="outline" className="font-mono text-[10px]">
            {selected.telauthorium_id}
          </Badge>
        </div>
        <div className="px-4 py-3 border-b border-border space-y-1">
          <h3 className="text-sm font-semibold">{selected.title}</h3>
          <div className="flex gap-2 text-[10px] text-muted-foreground font-mono">
            <span className="uppercase">{selected.category}</span>
            <span>•</span>
            <span>{selected.source_type}</span>
            <span>•</span>
            <span>{new Date(selected.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="prose-garvis text-xs">
            <ReactMarkdown>{selected.content}</ReactMarkdown>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            AKB
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowSaveDialog(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Tabs defaultValue={entries.length === 0 ? "templates" : "entries"} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2 bg-muted/50">
          <TabsTrigger value="entries" className="text-[10px] font-mono">
            <BookOpen className="h-3 w-3 mr-1" />
            Entries
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-[10px] font-mono">
            <Layers className="h-3 w-3 mr-1" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="ledger" className="text-[10px] font-mono">
            <Shield className="h-3 w-3 mr-1" />
            Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="flex-1 m-0">
          <ScrollArea className="h-full p-2">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-8">Loading...</p>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-2">
                <Database className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  Your Autonomous Knowledge Base is empty.
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  Save entries explicitly — AI cannot write here.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelected(entry)}
                    className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-muted/50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{entry.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[8px] px-1 py-0 font-mono">
                          {entry.category}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground font-mono truncate">
                          {entry.telauthorium_id}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 m-0">
          <AKBTemplatePanel
            conversationId={conversationId}
            onApplyTemplate={async (templateEntries) => {
              let count = 0;
              for (const entry of templateEntries) {
                const result = await addEntry(entry);
                if (result) count++;
              }
              toast.success(`Applied ${count} entries to AKB`);
            }}
          />
        </TabsContent>

        <TabsContent value="ledger" className="flex-1 m-0">
          <ScrollArea className="h-full p-2">
            {ledger.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No provenance records yet.
              </p>
            ) : (
              <div className="space-y-1">
                {ledger.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-md px-3 py-2 border border-border/50 bg-muted/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[10px] font-mono text-primary">{entry.action}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-mono mt-1 truncate">
                      {entry.telauthorium_id} — by {entry.actor}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <SaveToAKBDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        conversationId={conversationId}
        onSave={addEntry}
      />
    </div>
  );
}
