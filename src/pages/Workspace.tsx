import { useState, useRef, useCallback } from "react";
import { ConversationSidebar } from "@/components/workspace/ConversationSidebar";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { ArtifactPanel } from "@/components/workspace/ArtifactPanel";
import { AKBPanel } from "@/components/workspace/AKBPanel";
import { ProfilePanel } from "@/components/workspace/ProfilePanel";
import { AKBBuilderPanel } from "@/components/akb/AKBBuilderPanel";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUserProfile } from "@/hooks/useUserProfile";
import { streamChat, type AKBMeta } from "@/lib/stream-chat";
import { toast } from "sonner";
import { PanelRight, Database, User, Hammer } from "lucide-react";
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
  const [showAKBBuilder, setShowAKBBuilder] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // AKB soft-lock state
  const [akbMode, setAKBMode] = useState<"locked" | "foundation" | "full">("locked");
  const [akbCoverage, setAKBCoverage] = useState<number>(0);

  const {
    artifacts,
    versions,
    setSelected,
    createArtifact,
    saveNewVersion,
    fetchVersions,
  } = useArtifacts(user?.id, activeConvId);

  const { version: uopVersion, profileName, saveProfile, renameProfile } = useUserProfile(user?.id || null);

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
          onDone: async (meta?: AKBMeta) => {
            setIsStreaming(false);

            if (meta?.akbMode) {
              setAKBMode(meta.akbMode);
            }
            if (typeof meta?.akbCoverage === "number" && !Number.isNaN(meta.akbCoverage)) {
              setAKBCoverage(meta.akbCoverage);
            }

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

  const closePanels = () => {
    setShowProfile(false);
    setShowAKB(false);
    setShowArtifacts(false);
    setShowAKBBuilder(false);
  };

  const togglePanel = (panel: "profile" | "akb" | "akbBuilder" | "artifacts") => {
    if (panel === "artifacts" && !artifactsAllowed) {
      toast.error(`Artifacts locked until AKB is at 80% (current: ${akbCoverage}%).`);
      closePanels();
      setShowAKBBuilder(true);
      return;
    }

    const next =
      panel === "profile" ? !showProfile :
      panel === "akb" ? !showAKB :
      panel === "akbBuilder" ? !showAKBBuilder :
      !showArtifacts;

    closePanels();
    if (!next) return;

    if (panel === "profile") setShowProfile(true);
    if (panel === "akb") setShowAKB(true);
    if (panel === "akbBuilder") setShowAKBBuilder(true);
    if (panel === "artifacts") setShowArtifacts(true);
  };

  // Artifacts gated until AKB full (80%+)
  const artifactsAllowed = akbMode === "full";

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
            onClick={() => togglePanel("profile")}
          />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => togglePanel("profile")}
              className="gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <User className="h-4 w-4" />
              Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => togglePanel("akb")}
              className="gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Database className="h-4 w-4" />
              AKB
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => togglePanel("akbBuilder")}
              className="gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Hammer className="h-4 w-4" />
              AKB Builder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => togglePanel("artifacts")}
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
              onCreateArtifact={async (content) => {
                if (!artifactsAllowed) {
                  toast.error(`Artifacts locked until AKB is at 80% (current: ${akbCoverage}%).`);
                  togglePanel("akbBuilder");
                  return;
                }
                const title = content.slice(0, 50).replace(/[#*_\n]/g, "").trim() || "Untitled";
                await createArtifact(title, "text", content);
                togglePanel("artifacts");
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
          {showAKBBuilder && (
            <AKBBuilderPanel workspaceId={activeConvId ?? null} />
          )}
          {showProfile && (
            <ProfilePanel
              version={uopVersion}
              profileName={profileName}
              onSave={async (cfg) => { await saveProfile(cfg); }}
              onRename={async (n) => { await renameProfile(n); }}
              onClose={() => setShowProfile(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Workspace;
