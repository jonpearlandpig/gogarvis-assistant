export interface AKBTemplateEntry {
  title: string;
  content: string;
  category: string;
}

export interface AKBTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  icon: string;
  entries: AKBTemplateEntry[];
}

export const AKB_TEMPLATES: AKBTemplate[] = [
  {
    id: "construction-capex",
    name: "Construction & CapEx",
    industry: "Construction",
    description:
      "Capital project governance — gates, budgets, safety, compliance, and handover controls for construction programs.",
    icon: "🏗️",
    entries: [
      {
        title: "Program Overview & Scope",
        content:
          "Define the overall construction program, portfolio of projects, strategic objectives, and boundaries of what is governed under this AKB.\n\n**Prompts:**\n- What projects or asset types does this program cover?\n- What is the strategic mandate driving these builds?\n- What is explicitly out of scope?",
        category: "project",
      },
      {
        title: "Project Roles & Authority Matrix",
        content:
          "Enumerate every role with decision authority across the project lifecycle — Project Executive, Construction Manager, Safety Officer, Finance/CapEx Authority — and define approval limits, veto rights, and escalation paths.\n\n**Prompts:**\n- Who can approve change orders above $X?\n- Who holds stop-work authority on safety grounds?\n- What is the escalation chain when authority conflicts arise?",
        category: "reference",
      },
      {
        title: "Budget & CapEx Approval Thresholds",
        content:
          "Define the capex envelope, contingency bands, and tiered approval thresholds for budget changes.\n\n**Prompts:**\n- What is the total capex budget and how is it allocated?\n- At what dollar thresholds do approvals escalate (e.g., PM < $50K, Director < $250K, Board > $1M)?\n- What contingency percentage is standard, and who releases it?",
        category: "decision",
      },
      {
        title: "Schedule & Milestone Rules",
        content:
          "Establish baseline schedule governance — milestone definitions, float rules, schedule recovery triggers, and reporting cadence.\n\n**Prompts:**\n- What milestones are contractually binding?\n- At what point does schedule slip trigger recovery planning?\n- How often is schedule performance reviewed?",
        category: "project",
      },
      {
        title: "Change Order Rules",
        content:
          "Govern how scope, cost, and schedule changes are proposed, evaluated, approved, and recorded.\n\n**Prompts:**\n- What qualifies as a change order vs. a minor field directive?\n- What documentation is required before approval?\n- What is the maximum turnaround time for change order decisions?",
        category: "decision",
      },
      {
        title: "Procurement & Vendor Rules",
        content:
          "Define vendor qualification, bidding, selection, and contract administration rules.\n\n**Prompts:**\n- What safety and compliance records are required for vendor qualification?\n- Are sole-source awards permitted, and under what conditions?\n- How are vendor performance issues escalated?",
        category: "reference",
      },
      {
        title: "Safety & Compliance Protocols",
        content:
          "Establish non-negotiable safety obligations — building codes, life safety, OSHA/regulatory compliance, incident reporting, and stop-work authority.\n\n**Prompts:**\n- What safety certifications are required for on-site personnel?\n- What triggers a mandatory stop-work order?\n- How are near-misses and incidents reported and tracked?",
        category: "decision",
      },
      {
        title: "Quality Control & Inspections",
        content:
          "Define inspection gates, testing requirements, and quality acceptance criteria at each phase.\n\n**Prompts:**\n- What inspections are required before concrete pours, steel erection, or systems energization?\n- Who signs off on inspection results?\n- What happens when an inspection fails?",
        category: "reference",
      },
      {
        title: "Permitting & Regulatory Constraints",
        content:
          "Catalog all jurisdictional permits, regulatory approvals, and compliance milestones required before and during construction.\n\n**Prompts:**\n- What permits must be in hand before ground-breaking?\n- What regulatory inspections are required during construction?\n- How are permit conditions tracked and enforced?",
        category: "reference",
      },
      {
        title: "Risk & Insurance Constraints",
        content:
          "Define insurability requirements, risk transfer mechanisms, and the interface with Insurance & Risk governance.\n\n**Prompts:**\n- What insurance coverages are required (builder's risk, GL, workers' comp)?\n- What design or activity changes require re-submission to risk review?\n- What risk thresholds trigger project-level insurance review?",
        category: "decision",
      },
      {
        title: "Payment Applications & Retainage Rules",
        content:
          "Govern how progress payments are applied for, reviewed, approved, and released — including retainage schedules.\n\n**Prompts:**\n- What percentage retainage is held, and under what conditions is it released?\n- What documentation must accompany a payment application?\n- What is the maximum payment cycle time?",
        category: "reference",
      },
      {
        title: "Dispute Resolution & Escalation",
        content:
          "Define the structured path for resolving disagreements — from field-level disputes through formal mediation/arbitration.\n\n**Prompts:**\n- What is the first step when a contractor disputes a directive?\n- At what point does a dispute escalate beyond the project team?\n- What dispute resolution mechanisms are contractually required?",
        category: "decision",
      },
      {
        title: "Deal Breakers & Red Lines",
        content:
          "Enumerate absolute prohibitions — conditions under which work must stop, contracts may be terminated, or governance overrides are triggered.\n\n**Examples:**\n- Proceeding without required permits or site control\n- Violating known safety codes or domain AKB red lines\n- Committing capex beyond approved envelopes without governance\n- Concealing critical inspection or commissioning failures",
        category: "decision",
      },
      {
        title: "Templates & Checklists",
        content:
          "Maintain canonical templates for recurring project workflows.\n\n**Include:**\n- Project kickoff checklist\n- Change order approval form\n- Safety incident response plan\n- Inspection readiness checklist\n- Payment application review workflow\n- Schedule recovery plan template",
        category: "reference",
      },
      {
        title: "Audit & Closeout Cadence",
        content:
          "Define post-completion review requirements — planned vs. actual comparisons, lessons learned, and AKB update triggers.\n\n**Prompts:**\n- What projects require formal post-completion review?\n- How are lessons learned captured and fed back into governance?\n- What deviations trigger updates to this AKB or related domain AKBs?",
        category: "project",
      },
    ],
  },
];
