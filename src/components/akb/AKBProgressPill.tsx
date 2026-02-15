import { cn } from "@/lib/utils";

interface Props {
  percent: number;
  label?: string;
  onClick?: () => void;
}

export function AKBProgressPill({ percent, label, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5",
        "hover:bg-muted/50 transition-colors",
        percent >= 80 && "animate-pulse"
      )}
      type="button"
    >
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
        AKB
      </span>
      <span className="text-[11px] font-mono text-foreground">{percent}%</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-foreground/60 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      {label && (
        <span className="text-[10px] text-muted-foreground">{label}</span>
      )}
    </button>
  );
}
