import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ConversationSidebar } from "@/components/workspace/ConversationSidebar";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { ArtifactPanel } from "@/components/workspace/ArtifactPanel";
import { AKBPanel } from "@/components/workspace/AKBPanel";
import { ProfilePanel } from "@/components/workspace/ProfilePanel";
import { AKBBuilderPanel } from "@/components/akb/AKBBuilderPanel";
import {
  FoundationCompleteModal,
  WorkspaceRevealModal,
  OperatorModeBanner,
  SovereignRenameModal,
} from "@/components/workspace/ProgressionModals";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUserProfile } from "@/hooks/useUserProfile";
import { streamChat, type AKBMeta } from "@/lib/stream-chat";
import { GARVIS_UI } from "@/lib/garvis-ui-strings";
import { toast } from "sonner";
import { PanelRight, Database, User, Hammer, Receipt } from "lucide-react";
import { buildReceiptReportArtifactSeed } from "@/lib/receiptsToArtifact";
import { Button } from "@/components/ui/button";
import { UOPBadge } from "@/components/profile/UOPBadge";
import { runModuleDetection } from "@/lib/module-detection-client";
import { computeJournalScore } from "@/lib/journal-signal";
import { ModuleNudge } from "@/components/modules/ModuleNudge";

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
  const [showAKBBuilder, setShowAKBBuilder] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // AKB soft-lock state
  const [akbMode, setAKBMode] = useState<"locked" | "foundation" | "full">("locked");
  const [akbCoverage, setAKBCoverage] = useState<number>(0);

  // ─── Progression state ──────────────────────────────────
  const [prevAKBMode, setPrevAKBMode] = useState<"locked" | "foundation" | "full">("locked");
  const [workspaceRevealed, setWorkspaceRevealed] = useState(false);
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

  // Trigger foundation-complete when AKB first hits "full"
  useEffect(() => {
    if (prevAKBMode !== "full" && akbMode === "full" && !workspaceRevealed) {
      setShowFoundationComplete(true);
    }
    setPrevAKBMode(akbMode);
  }, [akbMode, prevAKBMode, workspaceRevealed]);

  // Operator mode: 30+ days
  useEffect(() => {
    if (!workspaceRevealed) return;
    if (accountAgeDays >= 30) setShowOperatorBanner(true);
  }, [workspaceRevealed, accountAgeDays]);

  // Sovereign mode: 60+ days
  useEffect(() => {
    if (!workspaceRevealed) return;
    if (accountAgeDays >= 60) setShowSovereignRename(true);
  }, [workspaceRevealed, accountAgeDays]);

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

      // Fire-and-forget journal detection
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

  const artifactsAllowed = akbMode === "full";

  const createReceiptsReportArtifact = useCallback(async () => {
    if (!user?.id) return;
    if (!artifactsAllowed) {
      toast.error(`Artifacts locked until AKB is at 80% (current: ${akbCoverage}%).`);
      togglePanel("akbBuilder");
      return;
    }
    try {
      const filters = { reimbursable: true };
      const { title, seed, rowsCount } = await buildReceiptReportArtifactSeed(filters);
      await createArtifact(title, "csv", seed);
      toast.success(`Artifact created: ${rowsCount} rows`);
      togglePanel("artifacts");
    } catch (err: any) {
      toast.error(err?.message || "Failed to build receipts report");
    }
  }, [user?.id, artifactsAllowed, akbCoverage, createArtifact, togglePanel]);

  // ─── Render ─────────────────────────────────────────────
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
        {/* Operator Mode Banner */}
        <OperatorModeBanner
          open={showOperatorBanner}
          onClose={() => setShowOperatorBanner(false)}
        />

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
            <Button variant="ghost" size="sm" onClick={() => togglePanel("akbBuilder")} className="gap-2 text-xs text-muted-foreground hover:text-foreground">
              <Hammer className="h-4 w-4" /> AKB Builder
            </Button>
            <Button variant="ghost" size="sm" onClick={() => togglePanel("artifacts")} className="gap-2 text-xs text-muted-foreground hover:text-foreground">
              <PanelRight className="h-4 w-4" /> Artifacts
            </Button>
            <Button variant="ghost" size="sm" onClick={createReceiptsReportArtifact} className="gap-2 text-xs text-muted-foreground hover:text-foreground">
              <Receipt className="h-4 w-4" /> Receipts Report
            </Button>
          </div>
        </div>

        {/* ── Gated workspace view ── */}
        {!workspaceRevealed ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center py-24 px-6 text-sm">
            <div className="font-medium">
              {akbMode === "full"
                ? GARVIS_UI.foundationComplete.title
                : GARVIS_UI.foundation.lockedWorkspace.title}
            </div>
            <div className="mt-2 text-muted-foreground">
              {akbMode === "full"
                ? GARVIS_UI.foundationComplete.body[0]
                : GARVIS_UI.foundation.lockedWorkspace.body[0]}
            </div>
            <div className="mt-6">
              <button onClick={() => togglePanel("akbBuilder")} className="text-xs underline">
                {GARVIS_UI.foundation.cta}
              </button>
            </div>
            <div className="mt-10 text-xs text-muted-foreground">
              {GARVIS_UI.footerTagline}
            </div>
          </div>
        ) : (
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
        )}
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
