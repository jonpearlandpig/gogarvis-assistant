/**
 * Builders Registry — single source of truth for user-facing builders.
 * Each builder maps its outputs into AKB domains internally;
 * users never see domain vocabulary.
 */

export type BuilderLevel = "beginner" | "all" | "advanced";

export type BuilderAction =
  | { type: "rpc"; fn: string; args?: Record<string, string> }
  | { type: "open_builder"; step: string }
  | { type: "open_guide" }
  | { type: "send_chat"; message: string }
  | { type: "create_artifact" };

export interface BuilderDef {
  id: string;
  title: string;
  subtitle: string;
  timeEstimate: string;
  level: BuilderLevel;
  /** Domains this builder writes to (hidden from user) */
  targetDomains: string[];
  /** When this builder should surface (checked against AKBProgress) */
  triggerCondition: (ctx: BuilderContext) => boolean;
  /** Primary action when user clicks "Start" */
  primaryAction: BuilderAction;
  /** Whether auto-draft toggle is available */
  hasAutoDraft: boolean;
  /** Sort priority (higher = surfaces first) */
  priority: number;
}

export type BuilderContext = {
  coveragePercent: number;
  completedDomains: string[];
  lockedDomains: string[];
  lockableDomains: string[];
  nextDomain: string | null;
  hasFirstDataset: boolean;
  workspaceUnlocked: boolean;
  hasDrafts: boolean;
};

// ─── Builder definitions ───────────────────────────────────

export const BUILDERS: BuilderDef[] = [
  {
    id: "profile_core_lock",
    title: "Quick Profile Lock",
    subtitle: "Name, tone, non-negotiables, operating posture",
    timeEstimate: "2 min",
    level: "beginner",
    targetDomains: ["identity"],
    triggerCondition: (ctx) =>
      !ctx.lockedDomains.includes("identity") && ctx.hasFirstDataset,
    primaryAction: { type: "open_builder", step: "identity" },
    hasAutoDraft: true,
    priority: 100,
  },
  {
    id: "exec_summary_builder",
    title: "Executive Summary → System Scaffold",
    subtitle: "Upload your brief; GARVIS creates project + drafts",
    timeEstimate: "3 min",
    level: "beginner",
    targetDomains: ["goals", "offer", "audience"],
    triggerCondition: (ctx) =>
      ctx.hasFirstDataset &&
      ctx.lockedDomains.includes("identity") &&
      ctx.coveragePercent < 80,
    primaryAction: {
      type: "send_chat",
      message: "goGarvis: I want to build my executive summary. Walk me through it.",
    },
    hasAutoDraft: true,
    priority: 90,
  },
  {
    id: "first_artifact",
    title: "Create Your First Artifact",
    subtitle: "Turn an output into a real file (doc, PDF, sheet)",
    timeEstimate: "1 min",
    level: "beginner",
    targetDomains: [],
    triggerCondition: (ctx) => ctx.workspaceUnlocked,
    primaryAction: { type: "create_artifact" },
    hasAutoDraft: false,
    priority: 85,
  },
  {
    id: "contacts_builder",
    title: "Contacts Builder",
    subtitle: "Extract and confirm key contacts from your data",
    timeEstimate: "2 min",
    level: "beginner",
    targetDomains: ["audience"],
    triggerCondition: (ctx) =>
      ctx.hasFirstDataset &&
      !ctx.lockedDomains.includes("audience"),
    primaryAction: {
      type: "send_chat",
      message: "goGarvis: Help me build my contacts list from what you know.",
    },
    hasAutoDraft: true,
    priority: 70,
  },
];

// ─── Helpers ───────────────────────────────────────────────

export function getEligibleBuilders(ctx: BuilderContext): BuilderDef[] {
  return BUILDERS
    .filter((b) => b.triggerCondition(ctx))
    .sort((a, b) => b.priority - a.priority);
}

export function getTopBuilders(ctx: BuilderContext, count = 3): BuilderDef[] {
  return getEligibleBuilders(ctx).slice(0, count);
}
