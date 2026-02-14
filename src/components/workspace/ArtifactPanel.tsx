import { useState } from "react";
import { FileText, Code, X, Copy, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import type { Artifact, ArtifactVersion } from "@/hooks/useArtifacts";

interface Props {
  artifacts: Artifact[];
  versions: ArtifactVersion[];
  onSelectArtifact: (a: Artifact) => void;
  onCreateArtifact: (title: string, type: string, seed: string) => Promise<void>;
  onSaveVersion: (artifactId: string, content: string) => Promise<void>;
  onClose: () => void;
}

export function ArtifactPanel({
  artifacts,
  versions,
  onSelectArtifact,
  onCreateArtifact,
  onSaveVersion,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<Artifact | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const latest = versions[0] || null;

  const handleSelect = (a: Artifact) => {
    setSelected(a);
    setEditing(false);
    onSelectArtifact(a);
  };

  const handleBack = () => {
    setSelected(null);
    setEditing(false);
    setCreating(false);
  };

  const copyContent = () => {
    if (!latest) return;
    navigator.clipboard.writeText(latest.content_md);
    toast.success("Copied to clipboard");
  };

  const downloadContent = () => {
    if (!latest) return;
    const blob = new Blob([latest.content_md], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected?.title || "artifact"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveVersion = async () => {
    if (!selected || !editContent.trim()) return;
    await onSaveVersion(selected.id, editContent);
    setEditing(false);
    toast.success("New version saved");
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    await onCreateArtifact(newTitle.trim(), "text", newContent.trim());
    setCreating(false);
    setNewTitle("");
    setNewContent("");
    toast.success("Artifact created");
  };

  // Creating new artifact
  if (creating) {
    return (
      <div className="flex h-full w-80 flex-col border-l border-border bg-card">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={handleBack} className="text-xs text-primary hover:underline">← Back</button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 p-4 space-y-3">
          <Input
            placeholder="Artifact title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="text-xs"
          />
          <Textarea
            placeholder="Content (markdown)"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="text-xs min-h-[200px]"
          />
          <Button size="sm" onClick={handleCreate} className="w-full text-xs">
            Create Artifact
          </Button>
        </div>
      </div>
    );
  }

  // Viewing selected artifact
  if (selected) {
    return (
      <div className="flex h-full w-80 flex-col border-l border-border bg-card">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={handleBack} className="text-xs text-primary hover:underline">← Back</button>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={copyContent} className="h-7 w-7">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={downloadContent} className="h-7 w-7">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-border">
          <h3 className="text-sm font-medium truncate">{selected.title}</h3>
          {latest && (
            <p className="text-[10px] text-muted-foreground">
              v{latest.version_number} · {latest.telauthorium_id}
            </p>
          )}
        </div>

        {editing ? (
          <div className="flex-1 flex flex-col p-4 gap-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 text-xs min-h-[200px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveVersion} className="text-xs flex-1">Save Version</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-xs">Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              {latest ? (
                <div className="prose-garvis text-xs">
                  <ReactMarkdown>{latest.content_md}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No versions yet.</p>
              )}
            </ScrollArea>
            <div className="p-3 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  setEditContent(latest?.content_md || "");
                  setEditing(true);
                }}
              >
                Edit & Save New Version
              </Button>
            </div>
          </>
        )}

        {/* Version history */}
        {versions.length > 1 && (
          <div className="border-t border-border p-3">
            <p className="text-[10px] text-muted-foreground mb-1">History</p>
            {versions.slice(1).map((v) => (
              <p key={v.id} className="text-[10px] text-muted-foreground">
                v{v.version_number} · {new Date(v.created_at).toLocaleDateString()}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Artifact list
  return (
    <div className="flex h-full w-80 flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Artifacts
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCreating(true)} className="h-6 w-6">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {artifacts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            No artifacts yet. Create one or let GARVIS generate them.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {artifacts.map((a) => (
              <button
                key={a.id}
                onClick={() => handleSelect(a)}
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
                    {a.status} · {new Date(a.created_at).toLocaleDateString()}
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
