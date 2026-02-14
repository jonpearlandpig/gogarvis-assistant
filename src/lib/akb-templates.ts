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
  {
    id: "tour-production",
    name: "Tour & Production",
    industry: "Live Events",
    description:
      "Live touring and production governance — routing, venues, crew, staging, safety, and show-day operations.",
    icon: "🎤",
    entries: [
      {
        title: "Tour Overview & Scope",
        content:
          "Define the tour or production program, show types, regions, and strategic objectives.\n\n**Prompts:**\n- What tours, residencies, or productions does this program cover?\n- What show typologies are included (arena, theater, festival, club, corporate)?\n- What is explicitly out of scope?",
        category: "project",
      },
      {
        title: "Organizational Roles & Authority",
        content:
          "Enumerate every role with decision authority — Tour Manager, Production Director, Safety Officer, vendors — and define approval limits, veto rights, and escalation paths.\n\n**Prompts:**\n- Who holds stop-show authority?\n- Who approves routing changes or venue substitutions?\n- What is the escalation chain for safety vs. commercial conflicts?",
        category: "reference",
      },
      {
        title: "Show-Day Timeline & Run of Show",
        content:
          "Define the canonical show-day timeline from load-in through load-out, including gates and checkpoints.\n\n**Prompts:**\n- What is the minimum load-in window for full production?\n- What checkpoints must be cleared before doors open?\n- What is the latest permissible show start given curfew constraints?",
        category: "project",
      },
      {
        title: "Load-In / Load-Out Procedures",
        content:
          "Govern how production equipment is loaded, staged, and struck at each venue.\n\n**Prompts:**\n- What is the standard truck count and dock requirements?\n- What safety protocols apply during rigging and steel work?\n- What is the minimum crew call for a safe load-out?",
        category: "reference",
      },
      {
        title: "Safety Protocols & Emergency Response",
        content:
          "Establish non-negotiable safety obligations — crowd management, structural integrity, fire/life safety, weather protocols, and emergency evacuation.\n\n**Prompts:**\n- What triggers a mandatory show stop or evacuation?\n- Who is responsible for weather monitoring and go/no-go decisions?\n- What medical resources must be on-site for each show type?",
        category: "decision",
      },
      {
        title: "Technical Specs (Audio, Lighting, Video)",
        content:
          "Define canonical production configurations (A-rig, B-rig, C-rig) and scaling rules.\n\n**Prompts:**\n- What components are non-negotiable for safety or show integrity?\n- Which elements can be scaled down for smaller venues?\n- What power and rigging minimums apply per configuration?",
        category: "reference",
      },
      {
        title: "Venue Requirements & Advancing Rules",
        content:
          "Define minimum venue suitability criteria — structural, licensing, capacity, egress, and production fit.\n\n**Prompts:**\n- What structural or rigging minimums must a venue meet?\n- What licensing or permitting must be confirmed before confirming a date?\n- How far in advance must venue advances be completed?",
        category: "reference",
      },
      {
        title: "Transportation & Logistics Rules",
        content:
          "Govern movement of gear, crew, and production between cities — respecting Logistics AKB constraints.\n\n**Prompts:**\n- What is the maximum overnight drive distance?\n- What customs or border-crossing rules apply for international legs?\n- What contingency plans exist for equipment delays or breakdowns?",
        category: "reference",
      },
      {
        title: "Staffing & Credentialing",
        content:
          "Define minimum crew composition per show type, credentialing requirements, and local crew standards.\n\n**Prompts:**\n- What safety-critical roles must be present at every show?\n- What certifications are required for riggers, electricians, pyro techs?\n- How are local crew qualified and briefed?",
        category: "reference",
      },
      {
        title: "Union & Labor Constraints",
        content:
          "Encode union and labor rules that affect scheduling, crew calls, and work conditions.\n\n**Prompts:**\n- What union jurisdictions apply in key markets?\n- What are the overtime, meal break, and turnaround rules?\n- What happens when union rules conflict with production timelines?",
        category: "decision",
      },
      {
        title: "Insurance & Risk Constraints",
        content:
          "Define insurability requirements, coverage minimums, and risk review triggers for tours and shows.\n\n**Prompts:**\n- What insurance coverages are required (event cancellation, GL, workers' comp)?\n- What activities or effects require special risk review?\n- What triggers re-submission to Insurance & Risk?",
        category: "decision",
      },
      {
        title: "Budget Guardrails",
        content:
          "Establish per-show and per-tour budget envelopes, margin requirements, and financial escalation thresholds.\n\n**Prompts:**\n- What is the per-show budget ceiling by venue type?\n- What minimum margin or contribution is required?\n- At what cost overrun threshold does financial escalation trigger?",
        category: "decision",
      },
      {
        title: "Deal Breakers & Red Lines",
        content:
          "Enumerate absolute prohibitions — conditions under which shows must be cancelled, legs revised, or governance overrides triggered.\n\n**Examples:**\n- Performing in venues that don't meet structural or safety minimums\n- Scheduling routes that make crew rest compliance impossible\n- Overriding medical, safety, or structural concerns for revenue\n- Using effects or crowd layouts that violate Insurance & Risk restrictions",
        category: "decision",
      },
      {
        title: "Templates & Checklists",
        content:
          "Maintain canonical templates for recurring tour workflows.\n\n**Include:**\n- Show-day execution checklist\n- Load-in / load-out timeline\n- Venue advance checklist\n- Safety incident response plan\n- Transportation contingency plan\n- Post-show review & notes",
        category: "reference",
      },
      {
        title: "Audit & Post-Show Review Cadence",
        content:
          "Define post-show and post-tour review requirements — comparing planned vs. actual performance, safety incidents, and lessons learned.\n\n**Prompts:**\n- What shows or legs require formal post-show review?\n- How are safety incidents and near-misses tracked across a tour?\n- What deviations trigger updates to this AKB?",
        category: "project",
      },
    ],
  },
  {
    id: "human-resources",
    name: "Human Resources",
    industry: "HR / People Ops",
    description:
      "People governance — roles, hiring, compliance, performance, discipline, and workforce planning constraints.",
    icon: "👥",
    entries: [
      {
        title: "Overview & Scope",
        content:
          "Define the HR governance program, organizational boundaries, and what people-related decisions are governed.\n\n**Prompts:**\n- What entities, regions, and employment types are in scope?\n- What is the relationship between HR governance and domain AKBs?\n- What is explicitly out of scope?",
        category: "project",
      },
      {
        title: "Org Structure & Approval Authority",
        content:
          "Define the organizational hierarchy, reporting lines, and approval authorities for people decisions.\n\n**Prompts:**\n- Who approves new headcount, role changes, and terminations?\n- What approval thresholds exist by level (manager, director, VP, exec)?\n- How are matrix or cross-functional reporting lines handled?",
        category: "reference",
      },
      {
        title: "Hiring & Offers",
        content:
          "Govern the hiring lifecycle — requisition, sourcing, interviewing, offer creation, and onboarding.\n\n**Prompts:**\n- What approvals are required before opening a requisition?\n- What is the standard interview process and who must be involved?\n- What offer terms require escalation (sign-on bonuses, equity, exceptions)?",
        category: "decision",
      },
      {
        title: "Compensation Bands & Leveling",
        content:
          "Define compensation frameworks, job leveling, and pay equity constraints.\n\n**Prompts:**\n- What are the compensation bands by level and geography?\n- What rules govern offers above or below band midpoint?\n- How often are bands reviewed and adjusted?",
        category: "reference",
      },
      {
        title: "Time Off & Leave",
        content:
          "Establish policies for PTO, sick leave, parental leave, sabbaticals, and other leave types.\n\n**Prompts:**\n- What leave types are offered and what are the accrual rules?\n- What jurisdictional variations apply?\n- What approval process governs extended or unpaid leave?",
        category: "reference",
      },
      {
        title: "Performance & Reviews",
        content:
          "Define the performance management cycle — goal setting, reviews, calibration, and outcomes.\n\n**Prompts:**\n- What is the review cadence (annual, semi-annual, continuous)?\n- How are performance ratings calibrated across teams?\n- What outcomes follow from different performance levels?",
        category: "project",
      },
      {
        title: "Discipline & Termination",
        content:
          "Govern progressive discipline, performance improvement plans (PIPs), and termination procedures.\n\n**Prompts:**\n- What behaviors trigger formal disciplinary action?\n- What is the standard PIP process and duration?\n- What approvals and documentation are required for termination?",
        category: "decision",
      },
      {
        title: "Benefits & Payroll Interfaces",
        content:
          "Define rules governing benefits administration and payroll — enrollment, changes, and compliance.\n\n**Prompts:**\n- What benefits are offered by employment type and geography?\n- What payroll rules and tax obligations must be enforced?\n- How are benefits changes during life events processed?",
        category: "reference",
      },
      {
        title: "Compliance & Jurisdiction Rules",
        content:
          "Encode employment law constraints — wage/hour, anti-discrimination, leave mandates, and reporting obligations by jurisdiction.\n\n**Prompts:**\n- What jurisdictions are in scope and what are the key legal constraints?\n- What mandatory reporting or posting requirements apply?\n- How are multi-jurisdiction employees handled?",
        category: "reference",
      },
      {
        title: "Security & Privacy",
        content:
          "Govern handling of sensitive HR data — access controls, retention, consent, and cross-system sharing rules.\n\n**Prompts:**\n- Who can access employee records and under what conditions?\n- What data retention and deletion rules apply?\n- How is HR data shared with other systems or AKBs?",
        category: "decision",
      },
      {
        title: "Training & Certifications",
        content:
          "Define required training, certification tracking, and readiness interlocks with Education & Training AKB.\n\n**Prompts:**\n- What training is mandatory by role or domain?\n- How are lapsed certifications detected and handled?\n- What readiness signals gate role assignments or promotions?",
        category: "reference",
      },
      {
        title: "Deal Breakers & Red Lines",
        content:
          "Enumerate absolute prohibitions — conditions under which HR actions must be blocked or escalated.\n\n**Examples:**\n- Assigning governed work to unauthorized or restricted individuals\n- Planning schedules that systematically violate legal work-hour limits\n- Using HR data in ways that violate privacy or anti-discrimination rules\n- Treating terminated or suspended individuals as active in authority routing",
        category: "decision",
      },
      {
        title: "Templates & Forms",
        content:
          "Maintain canonical templates for recurring HR workflows.\n\n**Include:**\n- New hire onboarding plan\n- Hiring checklist & approval flow\n- Offer creation workflow (band-gated)\n- Performance improvement plan\n- Termination checklist (approval-gated)\n- HR policy audit checklist",
        category: "reference",
      },
      {
        title: "Audit & Review Cadence",
        content:
          "Define HR audit cycles — policy reviews, compliance checks, and governance update triggers.\n\n**Prompts:**\n- How often are HR policies reviewed for compliance?\n- What triggers an out-of-cycle policy review?\n- How are audit findings tracked and resolved?",
        category: "project",
      },
    ],
  },
];
