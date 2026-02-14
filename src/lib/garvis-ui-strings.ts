// ==========================================
// GARVIS PROGRESSION SYSTEM UI STRINGS
// ==========================================

export const GARVIS_UI = {
  foundation: {
    headerBar: {
      title: "AKB Progress — {percent}%",
      subtitle: "Build your foundation to unlock full workspace.",
    },

    lockedWorkspace: {
      title: "Garvis is building your operating system.",
      body: [
        "You're laying the foundation.",
        "Complete your 6 core domains to unlock your full workspace.",
      ],
      remainingLabel: "Remaining:",
    },

    cta: "Continue Building AKB",

    domainComplete: {
      title: "Domain Complete — {domain}",
      subtitle: "Your foundation is getting stronger.",
    },
  },

  foundationComplete: {
    title: "Foundation Complete.",
    body: [
      "You've built the core of your operating system.",
      "Would you like to see what you've built?",
    ],
    cta: "Enter Workspace",
  },

  workspaceReveal: {
    title: "Welcome to Your Operating System.",
    bullets: [
      "Authoritative Knowledge Base",
      "Structured Projects",
      "Intelligent Artifacts",
      "Lens Profile Active",
    ],
  },

  operatorMode: {
    bannerTitle: "Operator Mode Activated.",
    bannerBody: "You've been consistent.",
    unlocksLabel: "New unlocks available:",
    unlocks: [
      "Advanced Templates",
      "Strategic Memory Packs",
      "Lens Precision Controls",
    ],
    cta: "Explore Advanced Tools",
  },

  sovereignMode: {
    title: "Sovereign Mode Unlocked.",
    body: "You've earned full control.",
    capabilitiesLabel: "You may now:",
    capabilities: [
      "Rename Garvis",
      "Adjust Intelligence Behavior",
      "Build Custom Prompt Libraries",
    ],
    cta: "Customize Intelligence",
  },

  artifactLock: {
    message: "Artifacts unlock at 80% AKB.",
    progress: "Current progress: {percent}%.",
    guidance: "Continue building your foundation.",
  },

  weeklyReward: {
    title: "Consistency Detected.",
    subtitle: "Progress accelerating.",
  },

  renameScreen: {
    title: "Name Your Intelligence",
    subtitle: "This system now adapts to you.",
  },

  footerTagline: "Lift the learner. Launch the leader.",
} as const;
