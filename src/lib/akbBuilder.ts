export const AKB_DOMAINS = [
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

export type AKBDomain = (typeof AKB_DOMAINS)[number];

export type AKBSource = {
  upload_id: string;
  page?: number;
  timecode?: string;
  quote_hash?: string;
  note?: string;
};

export function computeCoverage(approvedDrafts: { domain: string }[]) {
  const domainsWith = new Set(approvedDrafts.map((d) => d.domain));
  const total = AKB_DOMAINS.length;
  const have = Array.from(domainsWith).filter((d) =>
    AKB_DOMAINS.includes(d as any)
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
