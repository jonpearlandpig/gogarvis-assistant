// src/lib/builders-registry.ts
export type BuilderLevel = "beginner" | "intermediate" | "advanced";

export type BuilderAction =
  | { type: "open_builder"; step: "identity" | "exec_summary" | "contacts" }
  | { type: "create_artifact" }
  | { type: "send_chat"; message: string };

export type BuilderContext = {
  hasFirstDataset: boolean;
  workspaceUnlocked: boolean;
  coveragePercent: number;
  lockedDomains: string[]; // e.g. ["identity"]
};

export interface BuilderDef {
  id: string;
  title: string;
  subtitle: string;
  timeEstimate: string;
  level: BuilderLevel;
  trigger: (ctx: BuilderContext) => boolean;
  primaryAction: BuilderAction;
  hasAutoDraft: boolean;
  priority: number;
}

export const BUILDERS: BuilderDef[] = [
  {
    id: "profile_core_lock",
    title: "Quick Profile Lock",
    subtitle: "Name, tone, non-negotiables, operating posture",
    timeEstimate: "2 min",
    level: "beginner",
    trigger: (ctx) => ctx.hasFirstDataset && !ctx.lockedDomains.includes("identity"),
    primaryAction: { type: "open_builder", step: "identity" },
    hasAutoDraft: true,
    priority: 100,
  },
  {
    id: "exec_summary_builder",
    title: "Executive Summary → System Scaffold",
    subtitle: "Paste or upload a brief; GARVIS proposes drafts + project scaffold",
    timeEstimate: "3 min",
    level: "beginner",
    trigger: (ctx) => ctx.hasFirstDataset && ctx.lockedDomains.includes("identity") && ctx.coveragePercent < 80,
    primaryAction: { type: "send_chat", message: "goGarvis: Help me build my executive summary. QuickStart me." },
    hasAutoDraft: true,
    priority: 90,
  },
  {
    id: "first_artifact",
    title: "Create Your First Artifact",
    subtitle: "Turn an output into a real file (doc / pdf / sheet)",
    timeEstimate: "1 min",
    level: "beginner",
    trigger: (ctx) => ctx.workspaceUnlocked,
    primaryAction: { type: "create_artifact" },
    hasAutoDraft: false,
    priority: 85,
  },
  {
    id: "contacts_builder",
    title: "Contacts Builder",
    subtitle: "Extract + confirm key contacts from your uploads",
    timeEstimate: "2 min",
    level: "beginner",
    trigger: (ctx) => ctx.hasFirstDataset && ctx.lockedDomains.includes("identity"),
    primaryAction: { type: "send_chat", message: "goGarvis: Build my contacts list from my uploads. Propose. I approve." },
    hasAutoDraft: true,
    priority: 70,
  },
];

export function getTopBuilders(ctx: BuilderContext, n = 3) {
  return BUILDERS.filter((b) => b.trigger(ctx)).sort((a, b) => b.priority - a.priority).slice(0, n);
}
