import { useState, useRef, useEffect } from "react";
import { Send, Square, Copy, FileText, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import type { Msg } from "@/lib/stream-chat";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useChatUrlIntake } from "@/hooks/useChatUrlIntake";
import { UrlIngestPrompt } from "@/components/chat/UrlIngestPrompt";
import { uploadAKBFile } from "@/lib/akbUpload";
import { GarvisMessage, isGarvisPayload, type GarvisNextStep } from "@/components/chat/GarvisMessage";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { validateFileChange } from "@/lib/utils";
// Helper: Detect if a message is a file change suggestion from LLM
function parseFileChangeSuggestion(msg: string): null | { file: string; summary: string; diff: string } {
  // Example: LLM emits a JSON block with {"fileChange": { file, summary, diff }}
  try {
    const parsed = JSON.parse(msg);
    if (parsed && parsed.fileChange && parsed.fileChange.file && parsed.fileChange.diff) {
      return {
        file: parsed.fileChange.file,
        summary: parsed.fileChange.summary || "File change suggested by LLM.",
        diff: parsed.fileChange.diff,
      };
    }
  } catch {}
  return null;
}

type QuickStartStage = "akb_identity" | "akb_goals" | "akb_offer" | "foundation_complete" | "workspace";

const QUICK_START_ACTIONS: Record<QuickStartStage, { label: string; action: string }[]> = {
  akb_identity: [
    { label: "Define your identity", action: "save_identity" },
    { label: "Skip to goals", action: "skip_identity" },
  ],
  akb_goals: [
    { label: "Set your goals", action: "save_goals" },
    { label: "Continue to offer", action: "next_offer" },
  ],
  akb_offer: [
    { label: "Define your offer", action: "save_offer" },
    { label: "Keep building", action: "continue_building" },
  ],
  foundation_complete: [
    { label: "Enter workspace", action: "enter_workspace" },
    { label: "Start Project 01", action: "start_project" },
  ],
  workspace: [
    { label: "Create first artifact", action: "create_artifact" },
    { label: "Start new project", action: "new_project" },
  ],
};

interface Props {
  messages: (Msg & { id?: string })[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onCreateArtifact?: (content: string) => void;
  onUrlIngested?: (url?: string) => void;
  onFilesIngested?: (uploadIds: string[]) => void;
  userId?: string;
  workspaceId?: string | null;
  onQuickStart?: (action: string) => void;
  quickStartStage?: QuickStartStage;
  onGarvisAction?: (action: GarvisNextStep) => void;
}

type ComposerItem =
  | "Upload a doc (PDF/TXT/MD)"
  | "Add a website link"
  | "Paste inventory / pricing"
  | "Paste a mission / offer";

function ExampleChips({ onPick }: { onPick: (text: ComposerItem) => void }) {
  const items: ComposerItem[] = [
    "Upload a doc (PDF/TXT/MD)",
    "Add a website link",
    "Paste inventory / pricing",
    "Paste a mission / offer",
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="rounded-full border border-border/60 px-2.5 py-0.5 text-[10px] text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function ChatPanel({
  messages,
  isStreaming,
  onSend,
  onStop,
  onCreateArtifact,
  onUrlIngested,
  onFilesIngested,
  userId,
  workspaceId,
  onQuickStart,
  quickStartStage,
  onGarvisAction,
}: Props) {
  const [input, setInput] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlIntake = useChatUrlIntake((url) => onUrlIngested?.(url));

  // State for file change confirmation
  const [pendingFileChange, setPendingFileChange] = useState<null | { file: string; summary: string; diff: string }>(null);
  const [applyingChange, setApplyingChange] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Watch for new assistant messages that are file change suggestions
  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (last.role === "assistant" && last.content) {
      const suggestion = parseFileChangeSuggestion(last.content);
      if (suggestion) {
        const validation = validateFileChange(suggestion);
        if (!validation.valid) {
          setValidationError(validation.reason || 'File change not allowed.');
          setTimeout(() => setValidationError(null), 6000);
          return;
        }
        setPendingFileChange(suggestion);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = () => setMenuOpen(false);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [menuOpen]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    // Scan for URL before clearing input so ingest prompt persists
    urlIntake.scan(text);
    setInput("");
    onSend(text);
  };

  const handlePickFiles = async (files: FileList) => {
    if (!userId) return;
    const arr = Array.from(files);
    try {
      const uploadIds: string[] = [];
      for (const f of arr) {
        const result = await uploadAKBFile({ userId, workspaceId: workspaceId || null, file: f });
        if (result?.id) uploadIds.push(result.id);
      }
      console.log("CHAT UPLOAD COMPLETE → uploadIds:", uploadIds);
      toast.success(`Uploaded ${arr.length} file(s)`);
      onUrlIngested?.();
      if (uploadIds.length > 0) {
        onFilesIngested?.(uploadIds);
      }
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* File Change Confirmation Dialog */}
      {validationError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-100 text-red-800 border border-red-300 px-4 py-2 rounded shadow">
          {validationError}
        </div>
      )}
      {pendingFileChange && (
        <AlertDialog open onOpenChange={(open) => { if (!open) setPendingFileChange(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Review File Change</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="mb-2">
                  <strong>File:</strong> {pendingFileChange.file}
                </div>
                <div className="mb-2">
                  <strong>Summary:</strong> {pendingFileChange.summary}
                </div>
                <div className="mb-2 max-h-40 overflow-auto border p-2 bg-muted text-xs font-mono">
                  <pre>{pendingFileChange.diff}</pre>
                </div>
                Please review the proposed change. Confirm to apply, or cancel to ignore.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingFileChange(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={applyingChange}
                onClick={async () => {
                  setApplyingChange(true);
                  // TODO: Actually apply the file change (call backend or patch logic)
                  toast.success("File change applied (stub)");
                  setApplyingChange(false);
                  setPendingFileChange(null);
                }}
              >
                Confirm & Apply
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="font-mono text-2xl font-bold text-primary garvis-text-glow tracking-wider">
                GARVIS
              </div>
              <p className="text-sm text-muted-foreground">
                Sovereign Intelligence Layer — ready for your directive.
              </p>

              {quickStartStage && onQuickStart && (
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {QUICK_START_ACTIONS[quickStartStage].map((a) => (
                    <button
                      key={a.action}
                      type="button"
                      onClick={() => onQuickStart(a.action)}
                      className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary hover:bg-primary/10 hover:border-primary/50 transition-colors"
                    >
                      {a.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => onQuickStart("suggest")}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    What should I do next?
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div className="max-w-[85%]">
                <div
                  className={cn(
                    "rounded-lg px-4 py-3 text-sm",
                    msg.role === "user"
                      ? "bg-primary/15 border border-primary/20 text-foreground"
                      : "bg-card border border-border text-foreground"
                  )}
                >
                  {msg.role === "assistant" ? (
                    (() => {
                      // Try to detect structured GarvisAnswerPayload
                      try {
                        const parsed = JSON.parse(msg.content);
                        if (isGarvisPayload(parsed)) {
                          return (
                            <GarvisMessage
                              payload={parsed}
                              onAction={(a) => onGarvisAction?.(a)}
                            />
                          );
                        }
                      } catch {
                        // Not JSON — render as markdown
                      }
                      return (
                        <div className="prose-garvis">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "assistant" && msg.content && !isStreaming && (
                  <div className="flex items-center gap-1 mt-1.5 ml-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                      onClick={() => {
                        navigator.clipboard.writeText(msg.content);
                        setCopiedIdx(i);
                        toast.success("Copied to clipboard");
                        setTimeout(() => setCopiedIdx(null), 2000);
                      }}
                    >
                      {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedIdx === i ? "Copied" : "Copy"}
                    </Button>
                    {onCreateArtifact && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                        onClick={() => onCreateArtifact(msg.content)}
                      >
                        <FileText className="h-3 w-3" />
                        Save as Artifact
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3 justify-start">
              <div className="bg-card border border-border rounded-lg px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* URL Ingest Prompt */}
      {urlIntake.pendingUrl && (
        <UrlIngestPrompt
          url={urlIntake.pendingUrl}
          busy={urlIntake.busy}
          onConfirm={urlIntake.confirmIngest}
          onDismiss={urlIntake.clear}
        />
      )}

      {/* Composer */}
      <div className="border-t border-border p-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {/* Example chips */}
          <div className="mt-2">
            <div className="mb-1 text-[10px] text-muted-foreground/60">Try:</div>
            <ExampleChips
              onPick={(t) => {
                if (t === "Upload a doc (PDF/TXT/MD)") {
                  fileRef.current?.click();
                } else if (t === "Add a website link") {
                  setInput("https://");
                } else if (t === "Paste inventory / pricing") {
                  setInput("Paste your inventory/pricing here:\n");
                } else if (t === "Paste a mission / offer") {
                  setInput("Paste your mission/offer here:\n");
                }
              }}
            />
          </div>

          {/* Input row */}
          <div className="flex items-end gap-2">
            {/* Plus menu */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((p) => !p);
                }}
                className="h-9 w-9"
              >
                <Plus className="h-4 w-4" />
              </Button>

              {menuOpen && (
                <div
                  className="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-border bg-card shadow-lg z-50 py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                    onClick={() => {
                      setMenuOpen(false);
                      fileRef.current?.click();
                    }}
                  >
                    Add files / photos
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                    onClick={() => {
                      setMenuOpen(false);
                      setInput("https://");
                    }}
                  >
                    Add website link
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                    onClick={() => {
                      setMenuOpen(false);
                      setInput("");
                    }}
                  >
                    Paste text
                  </button>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp"
                onChange={async (e) => {
                  if (e.target.files && e.target.files.length) await handlePickFiles(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </div>

            <Textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Only scan on user typing (non-empty), not on programmatic clear
                if (e.target.value.trim()) urlIntake.scan(e.target.value);
              }}
              placeholder="Go Garvis!"
              className="min-h-[44px] max-h-32 resize-none bg-muted border-border font-mono text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isStreaming) handleSubmit();
                }
              }}
            />

            {isStreaming ? (
              <Button type="button" variant="secondary" className="h-9" onClick={onStop}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            ) : (
              <Button type="button" className="h-9" onClick={handleSubmit} disabled={!input.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
