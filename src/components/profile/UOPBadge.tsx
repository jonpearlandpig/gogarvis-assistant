function leadClasses(lead: string) {
  switch (lead) {
    case "systems":
      return "bg-primary/10 text-primary border-primary/20";
    case "creative":
      return "bg-secondary/40 text-foreground border-border";
    case "architect":
      return "bg-muted text-foreground border-border";
    case "business":
      return "bg-accent/30 text-foreground border-border";
    case "risk":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-foreground border-border";
  }
}

export function UOPBadge({
  version,
  onClick,
}: {
  version: { version_number: number; telauthorium_id: string; config_json?: any } | null;
  onClick?: () => void;
}) {
  if (!version) return null;

  const focus = version.config_json?.garvis_lens;
  const sum =
    (focus?.systems || 0) +
    (focus?.creative || 0) +
    (focus?.architect || 0) +
    (focus?.business || 0) +
    (focus?.risk || 0) || 1;

  const norm = focus
    ? {
        systems: Math.round(((focus.systems || 0) / sum) * 100),
        creative: Math.round(((focus.creative || 0) / sum) * 100),
        architect: Math.round(((focus.architect || 0) / sum) * 100),
        business: Math.round(((focus.business || 0) / sum) * 100),
        risk: Math.round(((focus.risk || 0) / sum) * 100),
      }
    : null;

  const lead =
    norm &&
    (Object.entries(norm).sort((a, b) => b[1] - a[1])[0]?.[0] || "systems");

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      title={`UOP v${version.version_number} • ${version.telauthorium_id}`}
    >
      <span className="font-mono">UOP v{version.version_number}</span>
      <span className="font-mono opacity-70">{version.telauthorium_id?.slice(0, 12)}…</span>
      {lead && (
        <span
          className={[
            "rounded-full border px-2 py-[2px] font-mono text-[10px]",
            leadClasses(lead),
          ].join(" ")}
        >
          Lead: {lead}
        </span>
      )}
    </button>
  );
}
