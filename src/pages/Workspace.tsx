import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ConversationSidebar } from "@/components/workspace/ConversationSidebar";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { ArtifactPanel } from "@/components/workspace/ArtifactPanel";
import { AKBPanel } from "@/components/workspace/AKBPanel";
import { ProfilePanel } from "@/components/workspace/ProfilePanel";
import { AKBBuilderPanel } from "@/components/akb/AKBBuilderPanel";
import { AKBBuildHero } from "@/components/workspace/AKBBuildHero";
import {
  FoundationCompleteModal,
  WorkspaceRevealModal,
  OperatorModeBanner,
  SovereignRenameModal,
} from "@/components/workspace/ProgressionModals";
import { ModuleNudge } from "@/components/modules/ModuleNudge";

import { EntryLevelGate } from "@/components/onboarding/EntryLevelGate";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAKBIntakeGate } from "@/hooks/useAKBIntakeGate";
import { useAKBDomains } from "@/hooks/useAKBDomains";
import { useAKBStructure } from "@/hooks/useAKBStructure";
import { useOnboardingGate } from "@/hooks/useOnboardingGate";
import { streamChat, type AKBMeta, type ScopeContract, type StreamResult } from "@/lib/stream-chat";
import { NotHereCard } from "@/components/scope/NotHereCard";
import { ScopeResolverCard } from "@/components/scope/ScopeResolverCard";
import { toast } from "sonner";
import { Hammer } from "lucide-react";
import { buildReceiptReportArtifactSeed } from "@/lib/receiptsToArtifact";
import { UOPBadge } from "@/components/profile/UOPBadge";
import { AKBStatusBar } from "@/components/akb/AKBStatusBar";
import { runModuleDetection } from "@/lib/module-detection-client";
import { computeJournalScore } from "@/lib/journal-signal";
import garvisLogo from "@/assets/garvis_logo_black.png";
import { ScopeIndicator } from "@/components/workspace/ScopeIndicator";
import { useScopedAKB } from "@/hooks/useScopedAKB";

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
  const [uiAction, setUiAction] = useState<null | { type: string; payload?: any }>(null);

  // AKB soft-lock state
  const [akbMode, setAKBMode] = useState<"locked" | "foundation" | "full">("locked");
  const [akbCoverage, setAKBCoverage] = useState<number>(0);
  const akbDomains = useAKBDomains(user?.id || null);
  const akbStructure = useAKBStructure(user?.id || null, null);
  const prevCompletedCount = useRef(0);
  const foundationLock = akbMode !== "full";

  // Scoped AKB (canonical + projects)
  const scopedAKB = useScopedAKB(user?.id || null);
  const activeProject = scopedAKB.projects.find((p) => p.id === scopedAKB.activeProjectId) || null;
  const scopeMode: "home" | "project" = scopedAKB.activeProjectId ? "project" : "home";

  const currentScope: ScopeContract = useMemo(() => ({
    mode: scopeMode,
    project_id: scopedAKB.activeProjectId,
    cross_project_allowed: scopeMode === "home",
  }), [scopeMode, scopedAKB.activeProjectId]);

  // Clear UI action when scope changes
  useEffect(() => {
    setUiAction(null);
  }, [scopedAKB.activeProjectId]);
  // ─── Gates ──────────────────────────────────────────────
  const gate = useAKBIntakeGate(user?.id || null, null);
  const onboarding = useOnboardingGate(user?.id || null);

  // ─── Explicit UI phases ─────────────────────────────────
  const showEntryGate = !!user?.id && !onboarding.loading && onboarding.entryLevel === "unset";
  const chatOnly = !gate.hasFirstDataset;
  const builderOnly = gate.hasFirstDataset && foundationLock;
  const workspaceUnlocked = gate.hasFirstDataset && !foundationLock;

  // chatOnly: hide everything
  useEffect(() => {
    if (chatOnly) {
      setShowAKBBuilder(false);
      setShowProfile(false);
      setShowAKB(false);
      setShowArtifacts(false);
    }
  }, [chatOnly]);

  // builderOnly: hide everything except AKB Builder
  useEffect(() => {
    if (builderOnly) {
      setShowProfile(false);
      setShowAKB(false);
      setShowArtifacts(false);
    }
  }, [builderOnly]);

  const openAKBBuilder = () => {
    if (chatOnly) {
      toast.message("Upload a file or add a quick note to begin.");
      return;
    }
    if (!builderOnly) return;
    setShowAKBBuilder((p) => !p);
  };

  const togglePanel = (panel: "profile" | "akb" | "artifacts") => {
    if (!workspaceUnlocked) return;

    if (panel === "artifacts" && akbMode !== "full") {
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
        const result = await streamChat({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user" as const, content: text },
          ],
          scope: currentScope,
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

            if (Array.isArray(meta?.completedDomains)) {
              const newCount = meta.completedDomains.length;
              if (prevCompletedCount.current > 0 && newCount > prevCompletedCount.current) {
                toast.success("Domain Complete");
              }
              prevCompletedCount.current = newCount;
              akbDomains.refetch();
            }

            if (fullResponse && convId) {
              await addMessage("assistant", fullResponse);
            }
          },
          signal: controller.signal,
        });

        if (result?.kind === "json") {
          const action = result.payload?.ui_action;
          if (action) setUiAction({ type: action, payload: result.payload });
        }
      } catch (err: any) {
        setIsStreaming(false);
        if (err.name !== "AbortError") {
          toast.error(err.message || "Failed to get response");
        }
      }
    },
    [activeConvId, messages, create, addMessage, appendLocal, updateLastAssistant, updateTitle, currentScope]
  );

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const handleSelectArtifact = (a: any) => {
    setSelected(a);
    fetchVersions(a.id);
  };

  const createReceiptsReportArtifact = useCallback(async () => {
    if (!user?.id || akbMode !== "full") {
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
  }, [user?.id, akbMode, akbCoverage, createArtifact]);

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full flex-col bg-background">
      {/* ── Entry Level Gate (first login) ── */}
      <EntryLevelGate
        open={showEntryGate}
        onChoose={async (level) => {
          await onboarding.choose(level);
          if (level === "already_building") {
            toast.message("Bulk intake ready. Upload documents or add websites.");
            setShowAKBBuilder(true);
          } else {
            toast.message("Let's build your foundation.");
            setShowAKBBuilder(false);
          }
        }}
      />

      {/* ── TOP BAR ── */}
      <div className="h-14 shrink-0 border-b border-border flex items-center justify-between px-4">
        {/* Left: GARVIS logo + scope indicator */}
        <div className="flex items-center gap-4">
          <img src={garvisLogo} alt="goGARVIS" className="h-10 sm:h-12" />
          {workspaceUnlocked && (
            <ScopeIndicator
              mode={scopeMode}
              activeProject={activeProject ? { id: activeProject.id, name: activeProject.name } : null}
              projects={scopedAKB.projects.map((p) => ({ id: p.id, name: p.name }))}
              onSelectProject={(id) => scopedAKB.setActiveProjectId(id)}
            />
          )}
        </div>

        {/* Right: AKB status + controls */}
        <div className="flex items-center gap-3">
          {gate.hasFirstDataset && (
            <AKBStatusBar
              domains={akbDomains.domains}
              completedCount={akbDomains.completedCount}
              total={akbDomains.total}
              coveragePercent={akbDomains.coveragePercent}
              nextDomain={akbDomains.nextDomain}
              visible={true}
            />
          )}

          {/* Far right: AKB Builder button (only after first dataset, before graduation) */}
          {builderOnly && (
            <button
              onClick={openAKBBuilder}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-border transition-colors ${
                showAKBBuilder ? "bg-muted text-foreground" : "hover:bg-muted/40 text-muted-foreground"
              }`}
            >
              <Hammer className="h-4 w-4" />
              AKB Builder
            </button>
          )}

          {/* Graduated: full nav */}
          {workspaceUnlocked && (
            <div className="flex items-center gap-3">
              <UOPBadge version={uopVersion} onClick={() => togglePanel("profile")} />
              <button onClick={() => togglePanel("profile")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Profile
              </button>
              <button onClick={() => togglePanel("akb")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                AKB
              </button>
              <button onClick={() => togglePanel("artifacts")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Artifacts
              </button>
              <button onClick={createReceiptsReportArtifact} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Receipts Report
              </button>
            </div>
          )}
        </div>
      </div>

      <OperatorModeBanner
        open={showOperatorBanner}
        onClose={() => setShowOperatorBanner(false)}
      />

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">
        {workspaceUnlocked && (
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

        <div className="flex flex-1 overflow-hidden">
          {/* Builder-only hero view: centered logo + input when no conversation yet */}
          {builderOnly && messages.length === 0 && !showAKBBuilder ? (
            <AKBBuildHero
              isStreaming={isStreaming}
              onSend={handleSend}
              userId={user?.id}
              workspaceId={null}
              onFilesUploaded={() => gate.refetch()}
              structureEntries={akbStructure.entries}
            />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {user?.id && <ModuleNudge userId={user.id} />}

              {uiAction?.type === "not_here" && (
                <div className="px-3 pb-2">
                  <NotHereCard
                    onSwitchHome={() => {
                      scopedAKB.setActiveProjectId(null);
                      setUiAction(null);
                    }}
                    onSearch={() => {
                      setUiAction({ type: "scope_resolver", payload: uiAction.payload });
                    }}
                  />
                </div>
              )}

              {uiAction?.type === "scope_resolver" && (
                <div className="px-3 pb-2">
                  <ScopeResolverCard
                    projects={scopedAKB.projects.map((p) => ({ id: p.id, name: p.name }))}
                    onSelect={(id) => {
                      scopedAKB.setActiveProjectId(id);
                      setUiAction(null);
                      toast.message("Switched scope. Ask again.");
                    }}
                  />
                </div>
              )}
              <ChatPanel
                messages={messages}
                isStreaming={isStreaming}
                onSend={handleSend}
                onStop={handleStop}
                onUrlIngested={() => gate.refetch()}
                userId={user?.id}
                workspaceId={null}
                onCreateArtifact={async (content) => {
                  if (akbMode !== "full") {
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
          )}

          {builderOnly && showAKBBuilder && (
            <div className="absolute left-0 top-0 bottom-0 w-[420px] border-r border-border bg-background z-30 shadow-lg overflow-auto">
              <AKBBuilderPanel workspaceId={null} />
            </div>
          )}

          {workspaceUnlocked && (
            <>
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
