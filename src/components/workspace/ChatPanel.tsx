import { useState, useRef, useEffect } from "react";
import { Send, Square, Copy, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import type { Msg } from "@/lib/stream-chat";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  messages: (Msg & { id?: string })[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onCreateArtifact?: (content: string) => void;
}

export function ChatPanel({ messages, isStreaming, onSend, onStop, onCreateArtifact }: Props) {
  const [input, setInput] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3 max-w-md">
              <div className="font-mono text-2xl font-bold text-primary garvis-text-glow tracking-wider">
                GARVIS
              </div>
              <p className="text-sm text-muted-foreground">
                Sovereign Intelligence Layer — ready for your directive.
              </p>
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
                    <div className="prose-garvis">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
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

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="mx-auto max-w-3xl flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your directive..."
            className="min-h-[44px] max-h-32 resize-none bg-muted border-border font-mono text-sm"
            rows={1}
          />
          {isStreaming ? (
            <Button onClick={onStop} variant="outline" size="icon" className="shrink-0 border-destructive/50 hover:bg-destructive/10">
              <Square className="h-4 w-4 text-destructive" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} size="icon" className="shrink-0" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
