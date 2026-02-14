import { AKB_DOMAINS } from "@/lib/akbBuilder";

export function evaluateGates(params: {
  drafts: { domain: string; status: string; sources: any[] }[];
  conflicts: { status: string }[];
  authorityConfigured: boolean;
}) {
  const approved = params.drafts.filter((d) => d.status === "approved");
  const byDomain = new Map<string, number>();
  for (const d of approved)
    byDomain.set(d.domain, (byDomain.get(d.domain) || 0) + 1);

  const domainsHave = AKB_DOMAINS.filter(
    (d) => (byDomain.get(d) || 0) > 0
  ).length;

  const MIN_CORE_DOMAINS = domainsHave >= 6;
  const IDENTITY_PRESENT = (byDomain.get("identity") || 0) > 0;
  const AUTHORITY_MAP = !!params.authorityConfigured;
  const SOURCES_MINIMUM = approved.every(
    (d) => Array.isArray(d.sources) && d.sources.length > 0
  );
  const CONFLICT_CHECK =
    params.conflicts.filter((c) => c.status === "open").length === 0;

  return [
    {
      gate_name: "MIN_CORE_DOMAINS",
      status: MIN_CORE_DOMAINS ? "pass" : "fail",
      evidence_json: { domainsHave, required: 6 },
    },
    {
      gate_name: "IDENTITY_PRESENT",
      status: IDENTITY_PRESENT ? "pass" : "fail",
      evidence_json: { identityDrafts: byDomain.get("identity") || 0 },
    },
    {
      gate_name: "AUTHORITY_MAP",
      status: AUTHORITY_MAP ? "pass" : "fail",
      evidence_json: { authorityConfigured: params.authorityConfigured },
    },
    {
      gate_name: "SOURCES_MINIMUM",
      status: SOURCES_MINIMUM ? "pass" : "fail",
      evidence_json: { approvedCount: approved.length },
    },
    {
      gate_name: "CONFLICT_CHECK",
      status: CONFLICT_CHECK ? "pass" : "fail",
      evidence_json: {
        openConflicts: params.conflicts.filter((c) => c.status === "open")
          .length,
      },
    },
  ];
}
