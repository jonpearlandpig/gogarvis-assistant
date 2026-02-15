import { useEffect, useMemo, useRef, useState } from "react";
import { useAKBBuilder } from "@/hooks/useAKBBuilder";
import { useAuth } from "@/hooks/useAuth";

import { uploadAKBFile } from "@/lib/akbUpload";
import { DomainCoverageChecklist } from "@/components/akb/DomainCoverageChecklist";
import { IdentityTapLock } from "@/components/akb/IdentityTapLock";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DOMAIN_ORDER = [
  "identity",
  "goals",
  "offer",
  "audience",
  "assets",
  "financial_model",
] as const;

const DOMAIN_LABELS: Record<string, string> = {
  identity: "Identity",
  goals: "Goals",
  offer: "Offer",
  audience: "Audience",
  assets: "Assets",
  financial_model: "Financial Model",
};

export function AKBBuilderPanel({
  workspaceId,
  initialStep,
  onFilesIngested,
}: {
  workspaceId: string | null;
  initialStep?: "identity" | "goals" | "offer" | "audience" | "assets" | "financial_model";
  onFilesIngested?: (uploadIds: string[]) => void;
}) {
  const { user } = useAuth();
  const akb = useAKBBuilder(user?.id || null, workspaceId);

  const [tab, setTab] = useState<
    "inbox" | "drafts" | "conflicts" | "law" | "gates"
  >("drafts");
  const [noteDomain, setNoteDomain] = useState(initialStep ?? "identity");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Sync noteDomain when initialStep changes (e.g. from SafeNextStep)
  useEffect(() => {
    if (initialStep) {
      setNoteDomain(initialStep);
      setTab("inbox");
    }
  }, [initialStep]);

  const approvedCount = useMemo(
    () => akb.drafts.filter((d) => d.status === "approved").length,
    [akb.drafts]
  );

  const authorityStub = {
    decision_owner_role: "Founder",
    decision_owner_id: user?.id,
    scope: workspaceId ? "workspace" : "system",
    approval_chain: [],
  };

  async function handleFiles(files: FileList | null) {
    if (!files || !user?.id) {
      console.warn("handleFiles blocked: no files or no user", { files: !!files, userId: user?.id });
      return;
    }
    const arr = Array.from(files);
    try {
      const uploadIds: string[] = [];
      for (const f of arr) {
        const result = await uploadAKBFile({ userId: user.id, workspaceId, file: f });
        if (result?.id) uploadIds.push(result.id);
      }

      console.log("UPLOAD COMPLETE → uploadIds:", uploadIds);
      toast.success(`Uploaded ${arr.length} file(s) to AKB Inbox`);
      await akb.refetch();

      if (!uploadIds || uploadIds.length === 0) {
        console.error("No uploadIds returned from upload");
        toast.error("No uploadIds passed to ingest");
        return;
      }

      if (onFilesIngested) {
        console.log("Triggering onFilesIngested callback with", uploadIds.length, "ids");
        onFilesIngested(uploadIds);
      } else {
        console.warn("onFilesIngested callback not provided — ingest will NOT trigger");
      }
    } catch (e: any) {
      console.error("Upload failed:", e);
      toast.error(e?.message || "Upload failed");
    }
  }

  return (
    <div className="w-[520px] border-l border-border bg-background p-3 space-y-3">
      {/* ── Domain Stepper ── */}
      <div className="flex flex-wrap items-center gap-2">
        {DOMAIN_ORDER.map((d) => {
          const active = noteDomain === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                setNoteDomain(d);
                setTab("inbox");
              }}
              className={cn(
                "rounded-full border border-border px-3 py-1 text-xs transition-colors",
                "hover:bg-muted/40",
                active && "bg-muted/50"
              )}
            >
              {DOMAIN_LABELS[d] ?? d}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono text-foreground">AKB Builder</div>
        <div className="text-[10px] text-muted-foreground">
          Coverage {akb.metrics.coverage.coveragePercent}% • Conflicts{" "}
          {akb.metrics.openConflicts} • Eligible{" "}
          {akb.metrics.eligible ? "YES" : "NO"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(["inbox", "drafts", "conflicts", "law", "gates"] as const).map(
          (t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-2 py-1 rounded border border-border ${
                tab === t
                  ? "bg-muted text-foreground"
                  : "hover:bg-muted/40 text-muted-foreground"
              }`}
            >
              {t.toUpperCase()}
            </button>
          )
        )}
      </div>

      {tab === "inbox" && (
        <div className="space-y-2">
          {/* Identity tap-lock (replaces text-first flow) */}
          {noteDomain === "identity" && (
            <IdentityTapLock
              sourceLabel="akb_builder"
              onComplete={async () => {
                await akb.refetch();
                setTab("drafts");
              }}
            />
          )}
          <div
            className="border border-dashed border-border rounded p-3 text-xs text-muted-foreground"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              await handleFiles(e.dataTransfer.files);
            }}
          >
            <div className="flex items-center justify-between">
              <div className="font-mono text-[11px]">Drop files here</div>
              <button
                className="text-xs border border-border rounded px-2 py-1 hover:bg-muted/40 text-foreground"
                onClick={() => fileRef.current?.click()}
              >
                Choose Files
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={async (e) => {
                await handleFiles(e.target.files);
                if (e.target) e.target.value = "";
              }}
            />
            <div className="mt-2 text-[10px]">
              PDFs, docs, CSVs, images, audio — stored in bucket{" "}
              <span className="font-mono">akb</span> and indexed in{" "}
              <span className="font-mono">akb_uploads</span>.
            </div>
          </div>

          <div className="text-xs font-mono text-foreground">
            Quick Note → Draft
          </div>
          {/* Domain (controlled by stepper) */}
          <div className="mb-2 text-xs text-muted-foreground">
            Domain: <span className="text-foreground">{DOMAIN_LABELS[noteDomain] ?? noteDomain}</span>
          </div>
          <div>
            <input
              className="w-full text-xs border border-border rounded px-2 py-1 bg-background text-foreground placeholder:text-muted-foreground"
              placeholder="Title"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
          </div>
          <textarea
            className="w-full text-xs border border-border rounded px-2 py-2 min-h-[90px] bg-background text-foreground placeholder:text-muted-foreground"
            placeholder="Write the knowledge…"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <button
            className="w-full text-xs border border-border rounded py-2 hover:bg-muted/40 text-foreground"
            onClick={async () => {
              if (!noteTitle.trim() || !noteBody.trim()) return;
              await akb.addQuickNote(
                noteDomain,
                noteTitle.trim(),
                noteBody.trim()
              );
              setNoteTitle("");
              setNoteBody("");
              setTab("drafts");
            }}
          >
            Save as Draft
          </button>

          <div className="mt-3 text-xs font-mono text-foreground">
            Recent Uploads
          </div>
          <ScrollArea className="max-h-[220px]">
            <div className="space-y-1">
              {akb.uploads.map((u) => (
                <div
                  key={u.id}
                  className="text-[11px] border border-border rounded px-2 py-1"
                >
                  <div className="font-mono text-foreground">{u.kind}</div>
                  <div className="text-muted-foreground">
                    {u.filename || u.source_label || u.id} •{" "}
                    {new Date(u.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {tab === "drafts" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-foreground">
              Draft Knowledge
            </div>
            <button
              className={`text-xs border border-border rounded px-2 py-1 text-foreground ${
                akb.metrics.eligible
                  ? "hover:bg-muted/40"
                  : "opacity-40 cursor-not-allowed"
              }`}
              onClick={() => akb.publishApprovedDrafts(authorityStub)}
              disabled={!akb.metrics.eligible}
              title={
                !akb.metrics.eligible
                  ? "Blocked by gates/conflicts"
                  : "Publish approved drafts"
              }
            >
              Publish Approved → LAW ({approvedCount})
            </button>
          </div>

          <ScrollArea className="max-h-[420px]">
            <div className="space-y-1">
              {akb.drafts.filter((d) => d.status !== "published").map((d) => (
                <div key={d.id} className="border border-border rounded p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-foreground">
                      {d.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {d.domain} • {d.status}
                    </div>
                  </div>
                  <div className="text-[11px] whitespace-pre-wrap mt-2 max-h-[120px] overflow-auto text-foreground">
                    {d.body_md}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      className="text-xs border border-border rounded px-2 py-1 hover:bg-muted/40 text-foreground"
                      onClick={() => akb.setDraftStatus(d.id, "review")}
                    >
                      Review
                    </button>
                    <button
                      className="text-xs border border-border rounded px-2 py-1 hover:bg-muted/40 text-foreground"
                      onClick={() => akb.setDraftStatus(d.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="text-xs border border-border rounded px-2 py-1 hover:bg-muted/40 text-foreground"
                      onClick={() => akb.setDraftStatus(d.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {tab === "conflicts" && (
        <div className="space-y-2">
          <div className="text-xs font-mono text-foreground">
            Conflicts (block publish)
          </div>
          <ScrollArea className="max-h-[520px]">
            <div className="space-y-1">
              {akb.conflicts.map((c) => (
                <div key={c.id} className="border border-border rounded p-2">
                  <div className="text-xs font-mono text-foreground">
                    {c.domain} • {c.conflict_type}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Status: {c.status}
                  </div>
                  <div className="text-[11px] mt-2 whitespace-pre-wrap text-foreground">
                    {c.notes || ""}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {tab === "law" && (
        <div className="space-y-2">
          <div className="text-xs font-mono text-foreground">
            AKB Law (immutable)
          </div>
          <DomainCoverageChecklist
            coveredDomains={akb.metrics.coverage.coveredDomains}
            missingDomains={akb.metrics.coverage.missingDomains}
            coveredCount={akb.metrics.coverage.coveredCount}
            coveragePercent={akb.metrics.coverage.coveragePercent}
            passesMinCoreDomains={akb.metrics.coverage.passesMinCoreDomains}
          />
          <ScrollArea className="max-h-[520px]">
            <div className="space-y-1">
              {akb.law.map((l) => (
                <div key={l.id} className="border border-border rounded p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-foreground">
                      {l.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {l.domain} • v{l.version_number} •{" "}
                      {l.telauthorium_id?.slice(0, 12)}…
                    </div>
                  </div>
                  <div className="text-[11px] mt-2 whitespace-pre-wrap max-h-[120px] overflow-auto text-foreground">
                    {l.body_md}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {tab === "gates" && (
        <div className="space-y-2">
          <div className="text-xs font-mono text-foreground">Proof Gates</div>
          <ScrollArea className="max-h-[520px]">
            <div className="space-y-1">
              {akb.gates.map((g) => (
                <div key={g.id} className="border border-border rounded p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-foreground">
                      {g.gate_name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {g.status}
                    </div>
                  </div>
                  <pre className="text-[10px] mt-2 whitespace-pre-wrap overflow-auto max-h-[140px] text-muted-foreground">
                    {JSON.stringify(g.evidence_json, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
