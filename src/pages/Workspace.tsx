import { useState, useRef, useCallback } from "react";
import { ConversationSidebar } from "@/components/workspace/ConversationSidebar";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { ArtifactPanel } from "@/components/workspace/ArtifactPanel";
import { AKBPanel } from "@/components/workspace/AKBPanel";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { streamChat } from "@/lib/stream-chat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PanelRight, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

const Workspace = () => {
  const { user } = useAuth();
  const { conversations, create, updateTitle, remove } = useConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const { messages, addMessage, appendLocal, updateLastAssistant } = useMessages(activeConvId);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [showAKB, setShowAKB] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleNewChat = useCallback(async () => {
    const conv = await create();
    if (conv) setActiveConvId(conv.id);
  }, [create]);

  const handleSend = useCallback(
    async (text: string) => {
      let convId = activeConvId;

      // Auto-create conversation if none active
      if (!convId) {
        const conv = await create();
        if (!conv) return;
        convId = conv.id;
        setActiveConvId(conv.id);
      }

      // Add user message
      appendLocal({ role: "user", content: text });
      await addMessage("user", text);

      // Auto-title on first message
      if (messages.length === 0) {
        const title = text.slice(0, 60) + (text.length > 60 ? "..." : "");
        updateTitle(convId, title);
      }

      // Stream AI response
      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      let fullResponse = "";

      try {
        await streamChat({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user" as const, content: text },
          ],
          onDelta: (chunk) => {
            fullResponse += chunk;
            updateLastAssistant(fullResponse);
          },
          onDone: async () => {
            setIsStreaming(false);
            if (fullResponse && convId) {
              await addMessage("assistant", fullResponse);
            }
          },
          signal: controller.signal,
        });
      } catch (err: any) {
        setIsStreaming(false);
        if (err.name !== "AbortError") {
          toast.error(err.message || "Failed to get response");
        }
      }
    },
    [activeConvId, messages, create, addMessage, appendLocal, updateLastAssistant, updateTitle]
  );

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={setActiveConvId}
        onCreate={handleNewChat}
        onDelete={(id) => {
          remove(id);
          if (activeConvId === id) setActiveConvId(null);
        }}
      />

      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-1 border-b border-border px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowAKB(!showAKB); if (!showAKB) setShowArtifacts(false); }}
            className="gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Database className="h-4 w-4" />
            AKB
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowArtifacts(!showArtifacts); if (!showArtifacts) setShowAKB(false); }}
            className="gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <PanelRight className="h-4 w-4" />
            Artifacts
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1">
            <ChatPanel
              messages={messages}
              isStreaming={isStreaming}
              onSend={handleSend}
              onStop={handleStop}
            />
          </div>
          {showArtifacts && (
            <div className="w-80 border-l border-border bg-card">
              <ArtifactPanel
                conversationId={activeConvId}
                onClose={() => setShowArtifacts(false)}
              />
            </div>
          )}
          {showAKB && (
            <div className="w-80 border-l border-border bg-card">
              <AKBPanel conversationId={activeConvId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workspace;
