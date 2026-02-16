import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ConversationSidebar } from "@/components/workspace/ConversationSidebar";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { ArtifactPanel } from "@/components/workspace/ArtifactPanel";
import { AKBPanel } from "@/components/workspace/AKBPanel";
import { ProfilePanel } from "@/components/workspace/ProfilePanel";
import { AKBBuilderPanel } from "@/components/akb/AKBBuilderPanel";
import { AKBBuildHero } from "@/components/workspace/AKBBuildHero";
import { IngestProposalPanel } from "@/components/ingest/IngestProposalPanel";
import { RecentUploadsPanel } from "@/components/ingest/RecentUploadsPanel";
import { useIngestPipeline } from "@/hooks/useIngestPipeline";
import {
  FoundationCompleteModal,
  WorkspaceRevealModal,
  OperatorModeBanner,
  SovereignRenameModal,
} from "@/components/workspace/ProgressionModals";

import { FoundationUnlockOverlay } from "@/components/system/FoundationUnlockOverlay";
import { ModuleNudge } from "@/components/modules/ModuleNudge";

import { EntryLevelGate } from "@/components/onboarding/EntryLevelGate";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useArtifacts } from "@/hooks/useArtifacts";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAKBIntakeGate } from "@/hooks/useAKBIntakeGate";
import { useAKBDomains } from "@/hooks/useAKBDomains";
import { useAKBProgress } from "@/hooks/useAKBProgress";
import { useAKBStructure } from "@/hooks/useAKBStructure";
import { useOnboardingGate } from "@/hooks/useOnboardingGate";
import { streamChat, type AKBMeta, type ScopeContract, type StreamResult } from "@/lib/stream-chat";
import { NotHereCard } from "@/components/scope/NotHereCard";
import { ScopeResolverCard } from "@/components/scope/ScopeResolverCard";
import { AKBNextStepsCard } from "@/components/chat/AKBNextStepsCard";
import { toast } from "sonner";
import { Hammer, LogOut, ShieldCheck } from "lucide-react";
import type { GarvisNextStep } from "@/components/chat/GarvisMessage";
import { supabase } from "@/integrations/supabase/client";
import { buildReceiptReportArtifactSeed } from "@/lib/receiptsToArtifact";
import { UOPBadge } from "@/components/profile/UOPBadge";
import { AKBStatusBar } from "@/components/akb/AKBStatusBar";
import { AKBProgressPill } from "@/components/akb/AKBProgressPill";
import { AKBGuidancePanel } from "@/components/akb/AKBGuidancePanel";
import { runModuleDetection } from "@/lib/module-detection-client";
import { computeJournalScore } from "@/lib/journal-signal";
import garvisLogo from "@/assets/garvis_logo_black.png";
import { ScopeIndicator } from "@/components/workspace/ScopeIndicator";
import { useScopedAKB } from "@/hooks/useScopedAKB";
import { AKBProgressTLDR } from "@/components/workspace/AKBProgressTLDR";
import { FirstNextStepCard } from "@/components/onboarding/FirstNextStepCard";
import { MomentumScreen } from "@/components/workspace/MomentumScreen";
import { getMomentumState, getNextStep, type MomentumContext } from "@/lib/momentum-state";

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
  const { user, signOut } = useAuth();
  const { conversations, create, updateTitle, remove } = useConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const { messages, addMessage, appendLocal, updateLastAssistant } = useMessages(activeConvId);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [showAKB, setShowAKB] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAKBBuilder, setShowAKBBuilder] = useState(false);
  const [akbBuilderStep, setAKBBuilderStep] = useState<"identity"|"goals"|"offer"|"audience"|"assets"|"financial_model">("identity");
  const abortRef = useRef<AbortController | null>(null);
  const [uiAction, setUiAction] = useState<null | { type: string; payload?: any }>(null);
   const [showIngestPanel, setShowIngestPanel] = useState(false);
   const [showNextSteps, setShowNextSteps] = useState(false);
   const [nextStepsSource, setNextStepsSource] = useState<string | null>(null);

  // AKB soft-lock state
  const [akbMode, setAKBMode] = useState<"locked" | "foundation" | "full">("locked");
  const [akbCoverage, setAKBCoverage] = useState<number>(0);
  const [celebrated80, setCelebrated80] = useState(false);
  const akbDomains = useAKBDomains(user?.id || null);
  const akbProgress = useAKBProgress(user?.id || null);
  const akbStructure = useAKBStructure(user?.id || null, null);
  const prevCompletedCount = useRef(0);

  // Derive akbMode from real progress data on load (not just chat meta)
  useEffect(() => {
    const pct = akbProgress.data?.coveragePercent ?? 0;
    if (pct >= 80) {
      setAKBMode("full");
      setAKBCoverage(pct);
    } else if (pct > 0) {
      setAKBMode("foundation");
      setAKBCoverage(pct);
    }
  }, [akbProgress.data?.coveragePercent]);

  const foundationLock = akbMode !== "full";
  const [showAKBGuide, setShowAKBGuide] = useState(false);

  // Scoped AKB (canonical + projects)
  const scopedAKB = useScopedAKB(user?.id || null);
  const activeProject = scopedAKB.projects.find((p) => p.id === scopedAKB.activeProjectId) || null;
  const scopeMode: "home" | "project" = scopedAKB.activeProjectId ? "project" : "home";

  // Ingest pipeline (after scopedAKB so workspaceId is available)
  const ingest = useIngestPipeline(user?.id || null, scopedAKB.activeProjectId ?? null);

  const currentScope: ScopeContract = useMemo(() => ({
    mode: scopeMode,
    project_id: scopedAKB.activeProjectId,
    cross_project_allowed: scopeMode === "home",
  }), [scopeMode, scopedAKB.activeProjectId]);

  // Clear UI action when scope changes
  useEffect(() => {
    setUiAction(null);
  }, [scopedAKB.activeProjectId]);

  // Safety: select first project after scaffold refresh lands
  useEffect(() => {
    if (!celebrated80) return;
    if (scopedAKB.activeProjectId) return;
    const firstId = scopedAKB.projects?.[0]?.id;
    if (firstId) scopedAKB.setActiveProjectId(firstId);
  }, [celebrated80, scopedAKB.projects, scopedAKB.activeProjectId]);
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

            // Always refetch domain status so status bar stays in sync
            await akbDomains.refetch();
            await akbProgress.refetch();

            if (typeof meta?.akbCoverage === "number" && !Number.isNaN(meta.akbCoverage)) {
              setAKBCoverage(meta.akbCoverage);

              if (meta.akbCoverage >= 80 && !celebrated80) {
                setCelebrated80(true);
                setShowAKBGuide(false);

                const { createdProjectId } = await scopedAKB.scaffoldOnUnlock();
                await scopedAKB.refresh();

                if (!scopedAKB.activeProjectId) {
                  if (createdProjectId) {
                    scopedAKB.setActiveProjectId(createdProjectId);
                  } else {
                    const firstId = scopedAKB.projects?.[0]?.id;
                    if (firstId) scopedAKB.setActiveProjectId(firstId);
                  }
                }

                toast.success("AKB Foundation Achieved — Workspace Unlocked", { duration: 5000 });
              }
            }

            if (Array.isArray(meta?.completedDomains)) {
              const newCount = meta.completedDomains.length;
              if (prevCompletedCount.current > 0 && newCount > prevCompletedCount.current) {
                toast.success("Domain Complete");
              }
              prevCompletedCount.current = newCount;
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

          if (result.payload?.message && convId) {
            await addMessage("assistant", String(result.payload.message));
          }
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

  // ─── Panel mutual exclusivity ───────────────────────────
  const openPanel = useCallback((panel: "ingest" | "builder") => {
    if (panel === "ingest") {
      setShowAKBBuilder(false);
      setShowIngestPanel(true);
    } else if (panel === "builder") {
      setShowIngestPanel(false);
      ingest.reset();
      setShowAKBBuilder(true);
    }
  }, [ingest]);

  // ─── Safe Next Step helpers ─────────────────────────────
  const openBuilderStep = (
    step: "identity" | "goals" | "offer" | "audience" | "assets" | "financial_model"
  ) => {
    setAKBBuilderStep(step);
    openPanel("builder");
  };

  // ─── Lock body scroll when mobile overlay is open ──────
  useEffect(() => {
    const anyOverlayOpen = showIngestPanel || showAKBBuilder;
    if (!anyOverlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [showIngestPanel, showAKBBuilder]);

  const safeStage:
    | "akb_identity"
    | "akb_goals"
    | "akb_offer"
    | "foundation_complete"
    | "workspace" =
    celebrated80
      ? "foundation_complete"
      : workspaceUnlocked
      ? "workspace"
      : akbCoverage < 20
      ? "akb_identity"
      : akbCoverage < 40
      ? "akb_goals"
      : "akb_offer";

  const handleSafeNextStep = (action: string) => {
    switch (action) {
      case "save_identity":
        openBuilderStep("identity");
        return;
      case "save_goals":
        openBuilderStep("goals");
        return;
      case "save_offer":
        openBuilderStep("offer");
        return;
      case "skip_identity":
      case "continue_building":
        setShowAKBGuide(true);
        return;
      case "next_offer":
        openBuilderStep("offer");
        return;
      case "enter_workspace":
        setCelebrated80(false);
        return;
      case "start_project":
        scopedAKB.scaffoldOnUnlock();
        setCelebrated80(false);
        return;
      case "create_artifact":
        handleSend("goGarvis: Welcome to Artifacts. Turn this into a real file.");
        return;
      case "new_project":
        scopedAKB.addProject("New Project");
        return;
      case "suggest":
      default:
        handleSend("goGarvis: What is the safest next step for me right now?");
        return;
    }
  };

  // ─── First Next Step handlers (button-only, no typing) ───
  const handleTryIt = useCallback(() => {
    handleSend("goGarvis: Try mode. Give me the fastest guided demo with buttons only.");
    setShowAKBGuide(true);
  }, [handleSend]);

  const handleBuildIt = useCallback(() => {
    setShowAKBGuide(true);
    handleSend("goGarvis: Build mode. Start the minimal 4 builders with buttons only.");
  }, [handleSend]);

  // ─── Momentum Context ──────────────────────────────────
  const momentumCtx: MomentumContext = useMemo(() => {
    const progress = akbProgress.data;
    const lockedDomains = (progress?.domains || []).filter((d: any) => d.locked).map((d: any) => d.domain_key);
    return {
      identityLocked: lockedDomains.includes("identity"),
      coveragePercent: progress?.coveragePercent ?? 0,
      workspaceUnlocked,
      hasProject: (scopedAKB.projects?.length ?? 0) > 0,
      hasArtifact: (artifacts?.length ?? 0) > 0,
      projectCount: scopedAKB.projects?.length ?? 0,
      artifactCount: artifacts?.length ?? 0,
      uploadCount: 0,
    };
  }, [akbProgress.data, workspaceUnlocked, scopedAKB.projects, artifacts]);

  const handleMomentumAction = useCallback((action: string) => {
    switch (action) {
      case "start_system":
        openBuilderStep("identity");
        return;
      case "try_demo":
        handleTryIt();
        return;
      case "returning_user":
        handleBuildIt();
        return;
      case "build_core_akb":
        setShowAKBGuide(true);
        return;
      case "upload":
        handleSend("goGarvis: I want to upload a doc. Show upload steps with buttons only.");
        return;
      case "strategic_question":
        handleSend("goGarvis: Ask me a strategic question about my business.");
        return;
      case "complete_domains":
        setShowAKBGuide(true);
        return;
      case "review_drafts":
        handleSend("goGarvis: Show me my existing drafts so I can review them.");
        return;
      case "create_project":
        scopedAKB.addProject("Project 01");
        return;
      case "create_artifact":
        handleSend("goGarvis: Welcome to Artifacts. Turn this into a real file.");
        return;
      case "system_health":
        handleSend("goGarvis: Review my system health and tell me what needs attention.");
        return;
      case "advance_project":
        handleSend("goGarvis: What is the next step for my active project?");
        return;
      case "optimize_system":
        handleSend("goGarvis: Optimize my system. What can be improved?");
        return;
      case "review_projects":
        handleSend("goGarvis: Show me a summary of all my projects.");
        return;
      default:
        handleSend("goGarvis: What is the safest next step for me right now?");
        return;
    }
  }, [handleTryIt, handleBuildIt, handleSend, scopedAKB]);

  // ─── Garvis No-Guess action handler ──────────────────────
  const handleGarvisAction = useCallback(async (a: GarvisNextStep) => {
    switch (a.type) {
      case "upload":
        // Trigger file input in ChatPanel via a send that opens the picker
        handleSend("goGarvis: I want to upload a doc.");
        return;
      case "open_recent_uploads":
        // No dedicated state yet — scroll to RecentUploadsPanel
        toast.message("Check your recent uploads above.");
        return;
      case "open_builder":
        setAKBBuilderStep(a.step as any || "identity");
        openPanel("builder");
        return;
      case "open_ingest_run":
        await ingest.openRun(a.runId);
        openPanel("ingest");
        return;
      case "create_quickstart_drafts":
        try {
          await supabase.rpc(
            a.domain === "identity" ? "akb_quickstart_identity" : "akb_quickstart_offer",
            { p_source: "quickstart_button" }
          );
          akbDomains.refetch();
          akbProgress.refetch();
          gate.refetch();
          toast.success("Quickstart drafts created");
        } catch (e: any) {
          toast.error(e?.message || "Failed to create quickstart drafts");
        }
        return;
      default:
        return;
    }
  }, [handleSend, openPanel, ingest, akbDomains, akbProgress, gate]);

  // ─── Upload → Ingest: single source of truth ───
  const handleFilesIngested = useCallback((uploadIds: string[]) => {
    console.log("[INGEST] handleFilesIngested uploadIds:", uploadIds);
    if (!uploadIds || uploadIds.length === 0) return;
    ingest.startIngest(uploadIds);
    openPanel("ingest");
  }, [ingest]);

  // ─── Integrity Test ─────────────────────────────
  const runIntegrityTest = useCallback(async () => {
    try {
      const userId = user?.id;
      if (!userId) { toast.error("Not logged in"); return; }

      const [uploads, runs, proposals, drafts, projects, artifacts_r] =
        await Promise.all([
          supabase.from("akb_uploads").select("id", { count: "exact", head: true }).eq("user_id", userId),
          supabase.from("ingest_runs").select("id", { count: "exact", head: true }).eq("user_id", userId),
          supabase.from("ingest_proposals").select("id", { count: "exact", head: true }).eq("user_id", userId),
          supabase.from("akb_drafts").select("id", { count: "exact", head: true }).eq("user_id", userId),
          supabase.from("akb_projects").select("id", { count: "exact", head: true }).eq("user_id", userId),
          supabase.from("artifacts").select("id", { count: "exact", head: true }).eq("user_id", userId),
        ]);

      const result = {
        uploads: uploads.count,
        ingest_runs: runs.count,
        ingest_proposals: proposals.count,
        akb_drafts: drafts.count,
        akb_projects: projects.count,
        artifacts: artifacts_r.count,
      };
      console.log("[INTEGRITY]", result);
      toast.success(
        `uploads=${result.uploads} runs=${result.ingest_runs} proposals=${result.ingest_proposals} drafts=${result.akb_drafts} projects=${result.akb_projects}`
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Integrity test failed");
    }
  }, [user?.id]);

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
            openPanel("builder");
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
          {gate.hasFirstDataset && akbProgress.data && (
            <AKBProgressPill
              percent={akbProgress.data.coveragePercent}
              label={akbProgress.data.nextDomain ? `Next: ${akbProgress.data.nextDomain}` : "Complete"}
              onClick={() => setShowAKBGuide((p) => !p)}
            />
          )}

          {/* Far right: AKB Builder button (always visible) */}
          <button
            onClick={openAKBBuilder}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded border border-border transition-colors ${
              showAKBBuilder ? "bg-muted text-foreground" : "hover:bg-muted/40 text-muted-foreground"
            }`}
          >
            <Hammer className="h-4 w-4" />
            AKB Builder
          </button>

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

          {/* Integrity Test */}
          <button
            onClick={runIntegrityTest}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Integrity Test"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Integrity</span>
          </button>

          {/* Sign Out — always visible */}
          <button
            onClick={async () => { await signOut(); window.location.href = "/auth"; }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-2"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      <OperatorModeBanner
        open={showOperatorBanner}
        onClose={() => setShowOperatorBanner(false)}
      />

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">
        {(workspaceUnlocked || gate.hasFirstDataset) && (
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

        <div className="flex flex-1 overflow-hidden flex-col">
          {/* Recent Uploads action queue — always visible when user has data */}
          {gate.hasFirstDataset && (
            <div className="px-3 py-2 shrink-0">
              <RecentUploadsPanel
                userId={user?.id || null}
                workspaceId={scopedAKB.activeProjectId ?? null}
                onOpenRun={(id) => {
                  ingest.openRun(id);
                  openPanel("ingest");
                }}
                onChanged={() => {
                  akbDomains.refetch();
                  akbProgress.refetch();
                  gate.refetch();
                }}
              />
            </div>
          )}

          {/* Momentum Screen: deterministic landing when no active chat */}
          {messages.length === 0 && !showAKBBuilder && !showAKBGuide ? (
            <MomentumScreen ctx={momentumCtx} onAction={handleMomentumAction} />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {user?.id && <ModuleNudge userId={user.id} />}


              {showAKBGuide && akbProgress.data && (
                <div className="px-3 py-2">
                  <AKBGuidancePanel
                    progress={akbProgress.data}
                    onLock={async (k) => {
                      try {
                        await akbProgress.lockDomain(k);
                        toast.success(`${k} locked`);
                      } catch (err: any) {
                        toast.error(err?.message || "Failed to lock domain");
                      }
                    }}
                    onContinue={(k, choice) => {
                      setShowAKBGuide(false);
                      if (choice) {
                        handleSend(`AKB: ${k}. Use selection: ${choice}. Generate a draft with 3 bullets + sources request.`);
                      } else {
                        openPanel("builder");
                      }
                    }}
                    onClose={() => setShowAKBGuide(false)}
                  />
                </div>
              )}

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

              {(showNextSteps || uiAction?.type === "akb_next_steps") && (
                <div className="px-3 pb-2">
                  <AKBNextStepsCard
                    detectedDomain={uiAction?.payload?.payload?.detected?.domain || "offer"}
                    detectedSource={nextStepsSource || uiAction?.payload?.payload?.detected?.source || "your upload"}
                    onDismiss={() => {
                      setShowNextSteps(false);
                      if (uiAction?.type === "akb_next_steps") setUiAction(null);
                    }}
                    onDraftsCreated={() => {
                      akbDomains.refetch();
                      akbProgress.refetch();
                      gate.refetch();
                    }}
                  />
                </div>
              )}

              <ChatPanel
                messages={messages}
                isStreaming={isStreaming}
                onSend={handleSend}
                onStop={handleStop}
                onUrlIngested={(url?: string) => {
                  gate.refetch();
                  if (url) {
                    setNextStepsSource(url);
                    setShowNextSteps(true);
                  }
                }}
                onFilesIngested={handleFilesIngested}
                userId={user?.id}
                workspaceId={null}
                onQuickStart={handleSafeNextStep}
                quickStartStage={gate.hasFirstDataset ? safeStage : undefined}
                onGarvisAction={handleGarvisAction}
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

          {/* AKB Builder rendered as full-screen overlay at root level */}

          {/* Ingest Panel rendered as full-screen overlay at root level */}

          {/* 80% Graduation Overlay */}
          <FoundationUnlockOverlay
            open={celebrated80}
            onEnter={() => setCelebrated80(false)}
            onStartProject={() => {
              scopedAKB.scaffoldOnUnlock();
              setCelebrated80(false);
            }}
          />

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

      {/* ── Mobile-only full-screen overlays (rendered at root level to escape stacking contexts) ── */}
      {showIngestPanel && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-background">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-xs font-medium text-foreground">What I Found</span>
            <button
              onClick={() => { setShowIngestPanel(false); ingest.reset(); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:bg-muted/40"
            >
              ✕ Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {ingest.run ? (
              <IngestProposalPanel
                run={ingest.run}
                entities={ingest.entities}
                proposals={ingest.proposals}
                loading={ingest.loading}
                classifyResult={ingest.classifyResult}
                onApprove={(p) => ingest.approveProposal(p)}
                onDeny={(id) => ingest.denyProposal(id)}
                onReclassify={(type) => ingest.reclassify(type)}
                onEdit={(id, summary, payload) => ingest.editProposal(id, summary, payload)}
                onBatchApprove={(ids) => ingest.batchApprove(ids)}
                onBatchDeny={(ids) => ingest.batchDeny(ids)}
                onApply={(id) => ingest.applyOne(id)}
                onClose={() => { setShowIngestPanel(false); ingest.reset(); }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-sm text-muted-foreground animate-pulse">
                  Classifying & extracting…
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  This usually takes a few seconds.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAKBBuilder && (
        <div className="fixed inset-0 z-[9998] flex flex-col bg-background">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-xs font-mono text-foreground">AKB Builder</span>
            <button
              onClick={() => setShowAKBBuilder(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:bg-muted/40"
            >
              ✕ Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <AKBBuilderPanel
              workspaceId={null}
              initialStep={akbBuilderStep}
              onFilesIngested={handleFilesIngested}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default Workspace;
