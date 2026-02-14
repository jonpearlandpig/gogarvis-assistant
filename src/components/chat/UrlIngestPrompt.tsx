import { Button } from "@/components/ui/button";
import { Globe, X } from "lucide-react";

interface Props {
  url: string;
  busy: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function UrlIngestPrompt({ url, busy, onConfirm, onDismiss }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-2">
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <Globe className="h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Ingest this link into your AKB?</p>
          <p className="text-xs text-muted-foreground truncate">{url}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onDismiss} disabled={busy}>
            <X className="h-3 w-3" />
          </Button>
          <Button size="sm" className="h-7 px-3 text-xs" onClick={onConfirm} disabled={busy}>
            {busy ? "Ingesting…" : "Ingest"}
          </Button>
        </div>
      </div>
    </div>
  );
}
