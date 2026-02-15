import { useState } from "react";
import { toast } from "sonner";
import { ingestUrlToAKB } from "@/lib/akb-url-ingest-client";

const URL_RE = /(https:\/\/[^\s]+)/i;

export function useChatUrlIntake(onIngested?: (url: string) => void) {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const scan = (text: string) => {
    const m = text.match(URL_RE);
    if (m?.[1]) setPendingUrl(m[1]);
    else setPendingUrl(null);
  };

  const clear = () => setPendingUrl(null);

  const confirmIngest = async () => {
    if (!pendingUrl) return;
    setBusy(true);
    try {
      await ingestUrlToAKB({ url: pendingUrl, create_draft: true });
      toast.success("Ingested. Draft created for AKB Builder.");
      const ingestedUrl = pendingUrl;
      clear();
      onIngested?.(ingestedUrl);
    } catch (e: any) {
      toast.error(e?.message || "Failed to ingest URL");
    } finally {
      setBusy(false);
    }
  };

  return { pendingUrl, busy, scan, clear, confirmIngest };
}
