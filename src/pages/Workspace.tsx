import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ConversationSidebar } from "@/components/workspace/ConversationSidebar";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { ArtifactPanel } from "@/components/workspace/ArtifactPanel";
import { AKBPanel } from "@/components/workspace/AKBPanel";
import { ProfilePanel } from "@/components/workspace/ProfilePanel";
import {
  FoundationCompleteModal,
  WorkspaceRevealModal,
  OperatorModeBanner,
  SovereignRenameModal,
} from "@/components/workspace/ProgressionModals";
import { ModuleRail } from "@/components/modules/ModuleRail";
import { ModuleHost } from "@/components/modules/ModuleHost";
import { ModuleNudge } from "@/components/modules/ModuleNudge";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useModuleRail } from "@/hooks/useModuleRail";
import { streamChat, type AKBMeta } from "@/lib/stream-chat";
import { toast } from "sonner";
import { PanelRight, Database, User, Receipt } from "lucide-react";
import { buildReceiptReportArtifactSeed } from "@/lib/receiptsToArtifact";
import { Button } from "@/components/ui/button";
import { UOPBadge } from "@/components/profile/UOPBadge";
import { runModuleDetection } from "@/lib/module-detection-client";
import { computeJournalScore } from "@/lib/journal-signal";

// ─── Helpers ──────────────────────────────────────────────
const daysBetween = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

function safeParseDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─── Component ────────────────────────────────────────────
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

  // AKB soft-lock state
  const [akbMode, setAKBMode] = useState<"locked" | "foundation" | "full">("locked");
  const [akbCoverage, setAKBCoverage] = useState<number>(0);
  const foundationLock = akbMode !== "full";

  // ─── Module rail ────────────────────────────────────────
  const rail = useModuleRail(user?.id, null);

  // ─── Progression state ──────────────────────────────────
  const [prevAKBMode, setPrevAKBMode] = useState<"locked" | "foundation" | "full">("locked");
  const [workspaceRevealed, setWorkspaceRevealed] = useState(true);
  const [showFoundationComplete, setShowFoundationComplete] = useState(false);
  const [showWorkspaceReveal, setShowWorkspaceReveal] = useState(false);
  const [showOperatorBanner, setShowOperatorBanner] = useState(false);
  const [showSovereignRename, setShowSovereignRename] = useState(false);
  const [customName, setCustomName] = useState("Garvis");

  const accountCreatedAt = useMemo(
    () => safeParseDate((user as any)?.created_at),
    [user]
  );
  const accountAgeDays = useMemo(() => {
    if (!accountCreatedAt) return 0;
    return Math.max(0, daysBetween(new Date(), accountCreatedAt));
  }, [accountCreatedAt]);

  useEffect(() => {
    if (prevAKBMode !== "full" && akbMode === "full" && !workspaceRevealed) {
      setShowFoundationComplete(true);
    }
    setPrevAKBMode(akbMode);
  }, [akbMode, prevAKBMode, workspaceRevealed]);

  useEffect(() => {
    if (!workspaceRevealed) return;
    if (accountAgeDays >= 30) setShowOperatorBanner(true);
  }, [workspaceRevealed, accountAgeDays]);

  useEffect(() => {
    if (!workspaceRevealed) return;
    if (accountAgeDays >= 60) setShowSovereignRename(true);
  }, [workspaceRevealed, accountAgeDays]);

  // Force-close locked panels during foundation lock
  useEffect(() => {
    if (!foundationLock) return;
    setShowProfile(false);
    setShowAKB(false);
    setShowArtifacts(false);
  }, [foundationLock]);

  // ─── Existing hooks ─────────────────────────────────────
  const {
    artifacts,
    versions,
    setSelected,
    createArtifact,
    saveNewVersion,
    fetchVersions,
  } = useArtifacts(user?.id, activeConvId);

  const { version: uopVersion, profileName, saveProfile, renameProfile } = useUserProfile(user?.id || null);

  // ─── Handlers ───────────────────────────────────────────
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

      const journalScore = computeJournalScore(text);
      if (journalScore >= 0.75) {
        runModuleDetection({
          source_type: "chat",
          source_id: convId,
          signals: { journal_score: journalScore },
        }).catch(() => {});
      }

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

            if (meta?.akbMode) setAKBMode(meta.akbMode);
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

  const togglePanel = (panel: "profile" | "akb" | "artifacts") => {
    if (foundationLock) return;

    const artifactsAllowed = akbMode === "full";
    if (panel === "artifacts" && !artifactsAllowed) {
      toast.error(`Artifacts locked until AKB is at 80% (current: ${akbCoverage}%).`);
      return;
    }

    const next =
      panel === "profile" ? !showProfile :
      panel === "akb" ? !showAKB :
      !showArtifacts;

    setShowProfile(false);
    setShowAKB(false);
    setShowArtifacts(false);
    if (!next) return;

    if (panel === "profile") setShowProfile(true);
    if (panel === "akb") setShowAKB(true);
    if (panel === "artifacts") setShowArtifacts(true);
  };

  const artifactsAllowed = akbMode === "full";

  const createReceiptsReportArtifact = useCallback(async () => {
    if (!user?.id) return;
    if (!artifactsAllowed) {
      toast.error(`Artifacts locked until AKB is at 80% (current: ${akbCoverage}%).`);
      return;
    }
    try {
      const filters = { reimbursable: true };
      const { title, seed, rowsCount } = await buildReceiptReportArtifactSeed(filters);
      await createArtifact(title, "csv", seed);
      toast.success(`Artifact created: ${rowsCount} rows`);
      setShowArtifacts(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to build receipts report");
    }
  }, [user?.id, artifactsAllowed, akbCoverage, createArtifact]);

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Module Rail (left) */}
      <ModuleRail
        activeModules={rail.activeModules}
        suggestedModules={rail.suggestedModules}
        activeKey={rail.activeKey}
        onSelect={(k) => rail.setActiveKey(k)}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Operator Mode Banner */}
        <OperatorModeBanner
          open={showOperatorBanner}
          onClose={() => setShowOperatorBanner(false)}
        />

        {/* Header bar — only visible when unlocked */}
        {!foundationLock && (
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <UOPBadge
              version={uopVersion}
              onClick={() => togglePanel("profile")}
            />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => togglePanel("profile")} className="gap-2 text-xs text-muted-foreground hover:text-foreground">
                <User className="h-4 w-4" /> Profile
              </Button>
              <Button variant="ghost" size="sm" onClick={() => togglePanel("akb")} className="gap-2 text-xs text-muted-foreground hover:text-foreground">
                <Database className="h-4 w-4" /> AKB
              </Button>
              <Button variant="ghost" size="sm" onClick={() => togglePanel("artifacts")} className="gap-2 text-xs text-muted-foreground hover:text-foreground">
                <PanelRight className="h-4 w-4" /> Artifacts
              </Button>
              <Button variant="ghost" size="sm" onClick={createReceiptsReportArtifact} className="gap-2 text-xs text-muted-foreground hover:text-foreground">
                <Receipt className="h-4 w-4" /> Receipts Report
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Conversation sidebar — only when unlocked */}
          {!foundationLock && (
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
          )}

          {/* Chat + module nudge */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {user?.id && <ModuleNudge userId={user.id} />}
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
                      return;
                    }
                    const title = content.slice(0, 50).replace(/[#*_\n]/g, "").trim() || "Untitled";
                    await createArtifact(title, "text", content);
                    setShowArtifacts(true);
                    toast.success("Artifact created");
                  }}
                />
              </div>

              {/* Active module panel OR unlocked side panels */}
              {foundationLock ? (
                <ModuleHost activeKey={rail.activeKey} workspaceId={null} />
              ) : (
                <>
                  {rail.activeKey && (
                    <ModuleHost activeKey={rail.activeKey} workspaceId={activeConvId ?? null} />
                  )}
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
                      profileName={profileName}
                      onSave={async (cfg) => { await saveProfile(cfg); }}
                      onRename={async (n) => { await renameProfile(n); }}
                      onClose={() => setShowProfile(false)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Progression modals ── */}
      <FoundationCompleteModal
        open={showFoundationComplete}
        onEnter={() => {
          setShowFoundationComplete(false);
          setShowWorkspaceReveal(true);
        }}
      />
      <WorkspaceRevealModal
        open={showWorkspaceReveal}
        onDone={() => {
          setShowWorkspaceReveal(false);
          setWorkspaceRevealed(true);
          toast.success("Workspace unlocked");
        }}
      />
      <SovereignRenameModal
        open={showSovereignRename}
        currentName={customName}
        onClose={() => setShowSovereignRename(false)}
        onSave={(n) => {
          setCustomName(n);
          setShowSovereignRename(false);
          toast.success(`Name updated: ${n}`);
        }}
      />
    </div>
  );
};

export default Workspace;
