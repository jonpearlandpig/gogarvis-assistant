import { useState, useRef, useCallback } from "react";
import { ConversationSidebar } from "@/components/workspace/ConversationSidebar";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { ArtifactPanel } from "@/components/workspace/ArtifactPanel";
import { AKBPanel } from "@/components/workspace/AKBPanel";
import { ProfilePanel } from "@/components/workspace/ProfilePanel";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUserProfile } from "@/hooks/useUserProfile";
import { streamChat } from "@/lib/stream-chat";
import { toast } from "sonner";
import { PanelRight, Database, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UOPBadge } from "@/components/profile/UOPBadge";

const Workspace = () => {
  const { user } = useAuth();
  const { conversations, create, updateTitle, remove } = useConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const { messages, addMessage, appendLocal, updateLastAssistant } = useMessages(activeConvId);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [showAKB, setShowAKB] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const {
    artifacts,
    versions,
    setSelected,
    createArtifact,
    saveNewVersion,
    fetchVersions,
  } = useArtifacts(user?.id, activeConvId);

  const { version: uopVersion, saveProfile } = useUserProfile(user?.id || null);

  const handleNewChat = useCallback(async () => {
    const conv = await create();
    if (conv) setActiveConvId(conv.id);
  }, [create]);

  const handleSend = useCallback(
    async (text: string) => {
      let convId = activeConvId;

      if (!convId) {
        const conv = await create();
        if (!conv) return;
        convId = conv.id;
        setActiveConvId(conv.id);
      }

      appendLocal({ role: "user", content: text });
      await addMessage("user", text);

      if (messages.length === 0) {
        const title = text.slice(0, 60) + (text.length > 60 ? "..." : "");
        updateTitle(convId, title);
      }

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

  const handleSelectArtifact = (a: any) => {
    setSelected(a);
    fetchVersions(a.id);
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
        onRename={(id, title) => updateTitle(id, title)}
      />

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <UOPBadge
            version={uopVersion}
            onClick={() => { setShowProfile(!showProfile); if (!showProfile) { setShowAKB(false); setShowArtifacts(false); } }}
          />
          <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowProfile(!showProfile); if (!showProfile) { setShowAKB(false); setShowArtifacts(false); } }}
            className="gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowAKB(!showAKB); if (!showAKB) { setShowArtifacts(false); setShowProfile(false); } }}
            className="gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Database className="h-4 w-4" />
            AKB
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowArtifacts(!showArtifacts); if (!showArtifacts) { setShowAKB(false); setShowProfile(false); } }}
            className="gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <PanelRight className="h-4 w-4" />
            Artifacts
          </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1">
            <ChatPanel
              messages={messages}
              isStreaming={isStreaming}
              onSend={handleSend}
              onStop={handleStop}
              onCreateArtifact={(content) => {
                const title = content.slice(0, 50).replace(/[#*_\n]/g, "").trim() || "Untitled";
                createArtifact(title, "text", content);
                setShowArtifacts(true);
                setShowAKB(false);
                toast.success("Artifact created");
              }}
            />
          </div>
          {showArtifacts && (
            <ArtifactPanel
              artifacts={artifacts}
              versions={versions}
              onSelectArtifact={handleSelectArtifact}
              onCreateArtifact={createArtifact}
              onSaveVersion={saveNewVersion}
              onClose={() => setShowArtifacts(false)}
            />
          )}
          {showAKB && (
            <div className="w-80 border-l border-border bg-card">
              <AKBPanel conversationId={activeConvId} />
            </div>
          )}
          {showProfile && (
            <ProfilePanel
              version={uopVersion}
              onSave={async (cfg) => { await saveProfile(cfg); }}
              onClose={() => setShowProfile(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Workspace;
