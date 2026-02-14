export const CORE_DOMAINS = [
  "identity",
  "projects",
  "ip",
  "finance",
  "brand",
  "contacts",
  "ops",
  "risk",
  "metrics",
  "timeline",
] as const;

// Keep legacy alias for any existing references
export const AKB_DOMAINS = CORE_DOMAINS;

export type CoreDomain = (typeof CORE_DOMAINS)[number];
export type AKBDomain = CoreDomain;

export type AKBSource = {
  upload_id: string;
  page?: number;
  timecode?: string;
  quote_hash?: string;
  note?: string;
};

type LawEntryLike = {
  domain?: string | null;
  status?: string | null;
  akb_id?: string | null;
  builder_id?: string | null;
};

export function computeDomainCoverageFromLaw(params: {
  lawEntries: LawEntryLike[];
  akbId?: string;
  builderId?: string;
  publishedStatus?: string;
}) {
  const {
    lawEntries,
    akbId,
    builderId,
    publishedStatus,
  } = params;

  const isCoreDomain = (d: unknown): d is CoreDomain =>
    typeof d === "string" && (CORE_DOMAINS as readonly string[]).includes(d);

  const filtered = publishedStatus
    ? lawEntries.filter((e) => {
        if (!e) return false;
        if ((e.status ?? "").toLowerCase() !== publishedStatus.toLowerCase()) return false;
        if (akbId && e.akb_id && e.akb_id !== akbId) return false;
        if (builderId && e.builder_id && e.builder_id !== builderId) return false;
        return true;
      })
    : lawEntries.filter((e) => {
        if (!e) return false;
        if (akbId && e.akb_id && e.akb_id !== akbId) return false;
        if (builderId && e.builder_id && e.builder_id !== builderId) return false;
        return true;
      });

  const coveredSet = new Set<CoreDomain>();
  for (const e of filtered) {
    if (isCoreDomain(e.domain)) coveredSet.add(e.domain);
  }

  const coveredDomains = CORE_DOMAINS.filter((d) => coveredSet.has(d));
  const missingDomains = CORE_DOMAINS.filter((d) => !coveredSet.has(d));
  const coveredCount = coveredDomains.length;
  const coveragePercent = Math.round((coveredCount / CORE_DOMAINS.length) * 100);

  return {
    coveredCount,
    totalDomains: CORE_DOMAINS.length,
    coveragePercent,
    coveredDomains,
    missingDomains,
    passesMinCoreDomains: coveredCount >= 6,
  };
}

/** @deprecated Use computeDomainCoverageFromLaw instead */
export function computeCoverage(approvedDrafts: { domain: string }[]) {
  const domainsWith = new Set(approvedDrafts.map((d) => d.domain));
  const total = CORE_DOMAINS.length;
  const have = Array.from(domainsWith).filter((d) =>
    CORE_DOMAINS.includes(d as any)
  ).length;
  return { have, total, pct: Math.round((have / total) * 100) };
}

export function publishEligible(params: {
  gates: { gate_name: string; status: "pass" | "fail" }[];
  openConflicts: number;
}) {
  const required = [
    "MIN_CORE_DOMAINS",
    "AUTHORITY_MAP",
    "SOURCES_MINIMUM",
    "CONFLICT_CHECK",
  ];
  const gateMap = new Map(params.gates.map((g) => [g.gate_name, g.status]));
  const requiredOk = required.every((k) => gateMap.get(k) === "pass");
  return requiredOk && params.openConflicts === 0;
}
