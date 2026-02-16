// src/lib/momentum-state.ts
// Deterministic Momentum State Machine for GARVIS

export type MomentumState =
  | "STATE_0_UNINITIALIZED"
  | "STATE_1_FOUNDATION"
  | "STATE_2_STRUCTURING"
  | "STATE_3_OPERATIONAL_READY"
  | "STATE_4_ACTIVE_BUILD"
  | "STATE_5_EXPANSION";

export type NextStep =
  | "identity_lock"
  | "core_akb_build"
  | "domain_completion"
  | "create_project"
  | "create_artifact"
  | "system_optimization";

export interface MomentumContext {
  identityLocked: boolean;
  coveragePercent: number;
  workspaceUnlocked: boolean;
  hasProject: boolean;
  hasArtifact: boolean;
  projectCount: number;
  artifactCount: number;
  uploadCount: number;
}

export function getMomentumState(ctx: MomentumContext): MomentumState {
  if (!ctx.identityLocked) return "STATE_0_UNINITIALIZED";
  if (ctx.coveragePercent < 60) return "STATE_1_FOUNDATION";
  if (ctx.coveragePercent < 80) return "STATE_2_STRUCTURING";
  if (ctx.projectCount > 1 && ctx.artifactCount > 2) return "STATE_5_EXPANSION";
  if (ctx.hasProject) return "STATE_4_ACTIVE_BUILD";
  return "STATE_3_OPERATIONAL_READY";
}

export function getNextStep(ctx: MomentumContext): NextStep {
  if (!ctx.identityLocked) return "identity_lock";
  if (ctx.coveragePercent < 60) return "core_akb_build";
  if (ctx.coveragePercent < 80) return "domain_completion";
  if (ctx.coveragePercent >= 80 && !ctx.hasProject) return "create_project";
  if (ctx.hasProject && !ctx.hasArtifact) return "create_artifact";
  return "system_optimization";
}

export interface MomentumScreenData {
  headline: string;
  subtext: string;
  primaryLabel: string;
  primaryAction: string;
  secondaryActions: { label: string; action: string }[];
}

export function getMomentumScreen(
  state: MomentumState,
  coveragePercent: number
): MomentumScreenData {
  switch (state) {
    case "STATE_0_UNINITIALIZED":
      return {
        headline: "Start in 60 seconds.",
        subtext: "Lock your foundation so Garvis can think clearly.",
        primaryLabel: "▶ Start My System",
        primaryAction: "start_system",
        secondaryActions: [
          { label: "Try Demo Mode", action: "try_demo" },
          { label: "I've Used Garvis Before", action: "returning_user" },
        ],
      };
    case "STATE_1_FOUNDATION":
      return {
        headline: "Your system is live. Let's strengthen it.",
        subtext: `Clarity: ${coveragePercent}%`,
        primaryLabel: "▶ Build My Core AKB",
        primaryAction: "build_core_akb",
        secondaryActions: [
          { label: "Upload Something", action: "upload" },
          { label: "Ask a Strategic Question", action: "strategic_question" },
        ],
      };
    case "STATE_2_STRUCTURING":
      return {
        headline: "Your system is forming structure.",
        subtext: "One more pass unlocks full workspace.",
        primaryLabel: "▶ Complete Core Domains",
        primaryAction: "complete_domains",
        secondaryActions: [
          { label: "Review Existing Drafts", action: "review_drafts" },
          { label: "Upload More Source Material", action: "upload" },
        ],
      };
    case "STATE_3_OPERATIONAL_READY":
      return {
        headline: "Workspace Ready.",
        subtext: "You can now run projects safely.",
        primaryLabel: "▶ Create Project",
        primaryAction: "create_project",
        secondaryActions: [
          { label: "Create Artifact", action: "create_artifact" },
          { label: "Review System Health", action: "system_health" },
        ],
      };
    case "STATE_4_ACTIVE_BUILD":
      return {
        headline: "Project in progress.",
        subtext: "Keep building momentum.",
        primaryLabel: "▶ Advance Active Project",
        primaryAction: "advance_project",
        secondaryActions: [
          { label: "Create Artifact", action: "create_artifact" },
          { label: "Upload More", action: "upload" },
        ],
      };
    case "STATE_5_EXPANSION":
      return {
        headline: "Multiple systems running.",
        subtext: "Time to optimize.",
        primaryLabel: "▶ Optimize System",
        primaryAction: "optimize_system",
        secondaryActions: [
          { label: "Review All Projects", action: "review_projects" },
          { label: "System Health", action: "system_health" },
        ],
      };
  }
}
