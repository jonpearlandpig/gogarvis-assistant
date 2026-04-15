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

export type StreamResult =
  | { kind: "json"; payload: any }
  | { kind: "stream" };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const CHAT_URL = SUPABASE_URL
  ? `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/chat`
  : "";

async function parseJsonIfPresent(resp: Response): Promise<any | null> {
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await resp.json();
  }
  return null;
}

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
}): Promise<StreamResult> {
  if (!CHAT_URL) {
    throw new Error("Backend URL is not configured");
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error("User not authenticated");
  }

  const scopePayload: ScopeContract = scope || { mode: "home", project_id: null, cross_project_allowed: true };

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages, scope: scopePayload }),
    signal,
  });

  // Handle JSON early-exit responses (ui_action, errors, etc.)
  const json = await parseJsonIfPresent(resp);
  if (json) {
    if (json.message) onDelta(json.message);
    onDone(json.akb_meta || {});
    return { kind: "json", payload: json };
  }

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

  const ct = resp.headers.get("content-type") || "";
  if (!ct.includes("text/event-stream")) {
    const t = await resp.text().catch(() => "");
    throw new Error(t || "Unexpected response type");
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
        return { kind: "stream" };
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
  return { kind: "stream" };
}
