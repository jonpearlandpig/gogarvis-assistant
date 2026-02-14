import { useState, useEffect } from "react";
import { FileText, Code, X, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Artifact {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

interface Props {
  conversationId: string | null;
  onClose: () => void;
}

export function ArtifactPanel({ conversationId, onClose }: Props) {
  const { user } = useAuth();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selected, setSelected] = useState<Artifact | null>(null);

  useEffect(() => {
    if (!conversationId || !user) {
      setArtifacts([]);
      return;
    }
    supabase
      .from("artifacts")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setArtifacts(data || []));
  }, [conversationId, user]);

  const copyContent = () => {
    if (!selected) return;
    navigator.clipboard.writeText(selected.content);
    toast.success("Copied to clipboard");
  };

  const downloadContent = () => {
    if (!selected) return;
    const ext = selected.type === "code" ? ".txt" : ".md";
    const blob = new Blob([selected.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.title}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (artifacts.length === 0) {
    return (
      <div className="flex h-full w-80 flex-col border-l border-border bg-card">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Artifacts
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            No artifacts yet. GARVIS will generate artifacts during your conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-80 flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Artifacts
        </span>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {selected ? (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <button onClick={() => setSelected(null)} className="text-xs text-primary hover:underline">
              ← Back
            </button>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={copyContent} className="h-7 w-7">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={downloadContent} className="h-7 w-7">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="px-4 py-2 border-b border-border">
            <h3 className="text-sm font-medium truncate">{selected.title}</h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="prose-garvis text-xs">
              <ReactMarkdown>{selected.content}</ReactMarkdown>
            </div>
          </ScrollArea>
        </div>
      ) : (
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {artifacts.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-muted/50 transition-colors"
              >
                {a.type === "code" ? (
                  <Code className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
