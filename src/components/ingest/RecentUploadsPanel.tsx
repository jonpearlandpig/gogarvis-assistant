import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type IngestRunRow = {
  id: string;
  created_at: string;
  status: string;
  detected_types: string[] | null;
  source_file_ids: string[] | null;
};

type IngestProposalRow = {
  id: string;
  ingest_id: string;
  proposal_type: string;
  status: string;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function RecentUploadsPanel({
  userId,
  workspaceId,
  onOpenRun,
  onChanged,
  className,
}: {
  userId: string | null;
  workspaceId: string | null;
  onOpenRun: (runId: string) => void;
  onChanged?: () => void;
  className?: string;
}) {
  const [runs, setRuns] = useState<IngestRunRow[]>([]);
  const [proposals, setProposals] = useState<IngestProposalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyRunId, setBusyRunId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      let query = supabase
        .from("ingest_runs")
        .select("id,created_at,status,detected_types,source_file_ids")
        .eq("user_id", userId)
        .neq("status", "removed")
        .order("created_at", { ascending: false })
        .limit(20);

      if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
      }

      const { data: r, error: e1 } = await query;
      if (e1) throw e1;

      const runIds = (r as any[])?.map((x: any) => x.id) ?? [];
      let p: any[] = [];
      if (runIds.length) {
        const { data: pp, error: e2 } = await supabase
          .from("ingest_proposals")
          .select("id,ingest_id,proposal_type,status")
          .in("ingest_id", runIds);
        if (e2) throw e2;
        p = (pp as any[]) ?? [];
      }

      setRuns((r as any[]) ?? []);
      setProposals(p);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load recent uploads");
    } finally {
      setLoading(false);
    }
  }, [userId, workspaceId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const countsByRun = useMemo(() => {
    const map = new Map<string, { drafts: number; projects: number; artifacts: number; total: number; applied: number }>();
    for (const p of proposals) {
      const cur = map.get(p.ingest_id) || { drafts: 0, projects: 0, artifacts: 0, total: 0, applied: 0 };
      cur.total += 1;
      if (p.status === "applied") cur.applied += 1;
      if (p.proposal_type === "akb_draft") cur.drafts += 1;
      else if (p.proposal_type === "artifact_seed") cur.artifacts += 1;
      else cur.projects += 1;
      map.set(p.ingest_id, cur);
    }
    return map;
  }, [proposals]);

  const approveAndApplyDrafts = async (runId: string) => {
    setBusyRunId(runId);
    try {
      const draftIds = proposals
        .filter((p) => p.ingest_id === runId && p.proposal_type === "akb_draft")
        .filter((p) => p.status === "proposed" || p.status === "approved" || p.status === "edited")
        .map((p) => p.id);

      if (draftIds.length === 0) {
        toast.message("No AKB drafts ready to apply for this upload");
        setBusyRunId(null);
        return;
      }

      const toApprove = proposals
        .filter((p) => p.ingest_id === runId && p.proposal_type === "akb_draft" && p.status === "proposed")
        .map((p) => p.id);

      if (toApprove.length > 0) {
        const { error: e1 } = await supabase.rpc("ingest_batch_set_status" as any, {
          p_ingest_id: runId,
          p_ids: toApprove,
          p_status: "approved",
        });
        if (e1) throw e1;
      }

      for (const id of draftIds) {
        const { error } = await supabase.rpc("ingest_apply_proposal" as any, { p_proposal_id: id });
        if (error) throw error;
      }

      toast.success(`Applied ${draftIds.length} AKB draft(s)`);
      await refetch();
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || "Approve & Apply failed");
    } finally {
      setBusyRunId(null);
    }
  };

  const removeUpload = async (run: IngestRunRow) => {
    setBusyRunId(run.id);
    try {
      const { error: e1 } = await supabase
        .from("ingest_runs")
        .update({ status: "removed" } as any)
        .eq("id", run.id);
      if (e1) throw e1;

      const ids = proposals.filter((p) => p.ingest_id === run.id && p.status === "proposed").map((p) => p.id);
      if (ids.length > 0) {
        const { error: e2 } = await supabase.rpc("ingest_batch_set_status" as any, {
          p_ingest_id: run.id,
          p_ids: ids,
          p_status: "denied",
        });
        if (e2) throw e2;
      }

      toast.success("Upload removed");
      await refetch();
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || "Remove failed");
    } finally {
      setBusyRunId(null);
    }
  };

  if (!userId) return null;

  return (
    <div className={cn("rounded-2xl border border-border bg-muted/10 p-4", className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">Recent uploads</div>
        <button
          onClick={refetch}
          className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="mt-3 text-xs text-muted-foreground">Loading…</div>}

      {!loading && runs.length === 0 && (
        <div className="mt-3 text-xs text-muted-foreground">No uploads yet.</div>
      )}

      <div className="mt-3 space-y-2">
        {runs.map((r) => {
          const c = countsByRun.get(r.id) || { drafts: 0, projects: 0, artifacts: 0, total: 0, applied: 0 };
          const busy = busyRunId === r.id;

          return (
            <div key={r.id} className="rounded-xl border border-border bg-background/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">
                    {fmtTime(r.created_at)} • {r.status}
                    {r.detected_types?.length ? ` • ${r.detected_types.join(", ").replace(/_/g, " ")}` : ""}
                  </div>
                  <div className="mt-1 text-sm text-foreground truncate">
                    {Array.isArray(r.source_file_ids) && r.source_file_ids.length > 0
                      ? `${r.source_file_ids.length} file${r.source_file_ids.length > 1 ? "s" : ""} uploaded`
                      : "Upload"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {c.drafts} drafts • {c.projects} projects • {c.artifacts} artifacts
                    {c.total > 0 ? ` • ${c.applied}/${c.total} applied` : ""}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <button
                    onClick={() => onOpenRun(r.id)}
                    disabled={busy}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted/30 transition-colors disabled:opacity-40"
                  >
                    Review
                  </button>
                  <button
                    onClick={() => approveAndApplyDrafts(r.id)}
                    disabled={busy}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted/30 transition-colors disabled:opacity-40"
                  >
                    {busy ? "Working…" : "Approve & Apply"}
                  </button>
                  <button
                    onClick={() => removeUpload(r)}
                    disabled={busy}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
