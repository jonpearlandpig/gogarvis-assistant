import { supabase } from "@/integrations/supabase/client";

export type Msg = { role: "user" | "assistant"; content: string };

export type AKBMeta = {
  akbMode?: "locked" | "foundation" | "full";
  akbCoverage?: number;
  completedDomains?: string[];
};

export type ScopeContract = {
  mode: "home" | "project";
  project_id: string | null;
  cross_project_allowed: boolean;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export async function streamChat({
  messages,
  scope,
  onDelta,
  onDone,
  signal,
}: {
  messages: Msg[];
  scope?: ScopeContract;
  onDelta: (deltaText: string) => void;
  onDone: (meta?: AKBMeta) => void;
  signal?: AbortSignal;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const scopePayload: ScopeContract = scope || { mode: "home", project_id: null, cross_project_allowed: true };

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages, scope: scopePayload }),
    signal,
  });

  // Read AKB headers immediately
  const akbModeRaw = resp.headers.get("X-AKB-Mode");
  const akbCoverageRaw = resp.headers.get("X-AKB-Coverage");
  const meta: AKBMeta = {};
  if (akbModeRaw === "locked" || akbModeRaw === "foundation" || akbModeRaw === "full") {
    meta.akbMode = akbModeRaw;
  }
  if (akbCoverageRaw) {
    const n = Number(akbCoverageRaw);
    if (!Number.isNaN(n)) meta.akbCoverage = n;
  }
  const domainsRaw = resp.headers.get("X-AKB-Completed-Domains");
  if (domainsRaw) {
    try { meta.completedDomains = JSON.parse(domainsRaw); } catch {}
  }

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${resp.status})`);
  }

  if (!resp.body) throw new Error("No response body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      const dataLines = event
        .split("\n")
        .map(l => l.replace(/\r$/, ""))
        .filter(l => l.startsWith("data:"))
        .map(l => l.slice(5).trim());

      if (dataLines.length === 0) continue;

      const data = dataLines.join("\n");

      if (data === "[DONE]") {
        onDone(meta);
        return;
      }

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        // ignore malformed partial chunks
      }
    }
  }

  onDone(meta);
}
