import { CORE_DOMAINS, type CoreDomain } from "@/lib/akbBuilder";

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function DomainCoverageChecklist(props: {
  coveredDomains: readonly CoreDomain[];
  missingDomains: readonly CoreDomain[];
  coveredCount: number;
  coveragePercent: number;
  passesMinCoreDomains: boolean;
}) {
  const {
    coveredDomains,
    missingDomains,
    coveredCount,
    coveragePercent,
    passesMinCoreDomains,
  } = props;

  const coveredSet = new Set(coveredDomains);

  return (
    <div className="rounded border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-mono text-foreground">
          Domain Coverage: {coveredCount}/{CORE_DOMAINS.length} ({coveragePercent}%)
        </div>
        <div
          className={`text-[10px] px-2 py-0.5 rounded-full border border-border font-mono ${
            passesMinCoreDomains
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {passesMinCoreDomains ? "PASS" : "NEED 6"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1">
        {CORE_DOMAINS.map((d) => {
          const ok = coveredSet.has(d);
          return (
            <div
              key={d}
              className={`flex items-center gap-2 rounded border border-border px-2 py-1 text-[11px] ${
                ok ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <div className="w-3 text-center font-mono">{ok ? "✓" : "—"}</div>
              <div className="flex-1">{titleCase(d)}</div>
              <div className="text-[10px]">{ok ? "Covered" : "Missing"}</div>
            </div>
          );
        })}
      </div>

      {missingDomains.length > 0 && (
        <div className="text-[10px] text-muted-foreground">
          Missing: {missingDomains.join(", ")}
        </div>
      )}
    </div>
  );
}
