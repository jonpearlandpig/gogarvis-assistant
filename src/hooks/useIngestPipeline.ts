import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  createIngestRun,
  triggerClassification,
  fetchIngestRun,
  fetchIngestEntities,
  fetchIngestProposals,
  updateProposalStatus,
  applyApprovedProposal,
  reclassifyIngestRun,
  updateProposalEdit,
  batchSetProposalStatus,
  applyProposal,
  type IngestRun,
  type IngestEntity,
  type IngestProposal,
} from "@/lib/ingest-client";

export function useIngestPipeline(userId: string | null, workspaceId: string | null) {
  const [run, setRun] = useState<IngestRun | null>(null);
  const [entities, setEntities] = useState<IngestEntity[]>([]);
  const [proposals, setProposals] = useState<IngestProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [classifyResult, setClassifyResult] = useState<any>(null);

  const startIngest = useCallback(async (sourceFileIds: string[]) => {
    if (!userId) {
      console.error("startIngest blocked: missing userId");
      toast.error("Missing user — ingest blocked");
      return;
    }
    if (!sourceFileIds || sourceFileIds.length === 0) {
      console.error("startIngest blocked: no sourceFileIds");
      toast.error("No files provided for ingest");
      return;
    }

    console.log("Creating ingest run:", { userId, workspaceId, sourceFileIds });
    setLoading(true);

    try {
      const newRun = await createIngestRun({ userId, workspaceId, sourceFileIds });
      console.log("INGEST RUN CREATED:", newRun.id);
      setRun(newRun);

      const result = await triggerClassification(newRun.id);
      console.log("INGEST CLASSIFY RESULT:", result);
      setClassifyResult(result);

      if (result.status === "needs_classification") {
        setRun({ ...newRun, status: "needs_classification" });
        toast.info("Low confidence — please confirm the document type.");
        setLoading(false);
        return;
      }

      const [ents, props] = await Promise.all([
        fetchIngestEntities(newRun.id),
        fetchIngestProposals(newRun.id),
      ]);
      setEntities(ents);
      setProposals(props);
      setRun({ ...newRun, status: "proposed" });

      toast.success(
        `Found ${ents.length} entities, ${props.length} proposals`
      );

      // AUTO-APPLY: apply all AKB draft proposals immediately (no user clicks)
      try {
        const akbDraftIds = (props || [])
          .filter((p: IngestProposal) => p.proposal_type === "akb_draft" && p.status === "proposed")
          .map((p: IngestProposal) => p.id);

        if (akbDraftIds.length > 0) {
          // Mark approved in one shot
          await batchSetProposalStatus({
            ingestId: newRun.id,
            ids: akbDraftIds,
            status: "approved",
          });

          // Apply each via RPC (writes to akb_drafts)
          for (const id of akbDraftIds) {
            await applyProposal(id);
          }

          // Refresh proposals state to show applied
          const refreshed = await fetchIngestProposals(newRun.id);
          setProposals(refreshed);

          toast.success(`Auto-filed ${akbDraftIds.length} AKB draft(s)`);
        }
      } catch (e: any) {
        // Non-fatal: keep proposals UI available for manual apply
        toast.error(e?.message || "Auto-apply failed (manual apply still available)");
      }
    } catch (err: any) {
      toast.error(err?.message || "Ingest failed");
      if (run) setRun({ ...run, status: "failed" });
    } finally {
      setLoading(false);
    }
  }, [userId, workspaceId]);

  const refetchProposals = useCallback(async () => {
    if (!run) return;
    const props = await fetchIngestProposals(run.id);
    setProposals(props);
  }, [run]);

  const approveProposal = useCallback(async (proposal: IngestProposal) => {
    if (!userId) return;
    try {
      await updateProposalStatus(proposal.id, "approved");
      await applyApprovedProposal(proposal, userId, workspaceId);
      setProposals((prev) =>
        prev.map((p) => p.id === proposal.id ? { ...p, status: "approved" } : p)
      );
      toast.success(`Approved: ${proposal.summary}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve");
    }
  }, [userId, workspaceId]);

  const denyProposal = useCallback(async (proposalId: string) => {
    try {
      await updateProposalStatus(proposalId, "denied");
      setProposals((prev) =>
        prev.map((p) => p.id === proposalId ? { ...p, status: "denied" } : p)
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to deny");
    }
  }, []);

  const editProposal = useCallback(async (proposalId: string, editedSummary: string, editedPayload: any) => {
    try {
      await updateProposalEdit({ proposalId, editedSummary, editedPayload });
      setProposals((prev) =>
        prev.map((p) => p.id === proposalId
          ? { ...p, status: "edited" as const, edited_summary: editedSummary, edited_payload_json: editedPayload }
          : p
        )
      );
      toast.success("Proposal updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save edits");
    }
  }, []);

  const batchApprove = useCallback(async (ids: string[]) => {
    if (!run || ids.length === 0) return;
    try {
      await batchSetProposalStatus({ ingestId: run.id, ids, status: "approved" });
      setProposals((prev) =>
        prev.map((p) => ids.includes(p.id) ? { ...p, status: "approved" as const } : p)
      );
      toast.success(`Approved ${ids.length} proposal(s)`);
    } catch (err: any) {
      toast.error(err?.message || "Batch approve failed");
    }
  }, [run]);

  const batchDeny = useCallback(async (ids: string[]) => {
    if (!run || ids.length === 0) return;
    try {
      await batchSetProposalStatus({ ingestId: run.id, ids, status: "denied" });
      setProposals((prev) =>
        prev.map((p) => ids.includes(p.id) ? { ...p, status: "denied" as const } : p)
      );
      toast.success(`Denied ${ids.length} proposal(s)`);
    } catch (err: any) {
      toast.error(err?.message || "Batch deny failed");
    }
  }, [run]);

  const applyOne = useCallback(async (proposalId: string) => {
    try {
      const result = await applyProposal(proposalId);
      setProposals((prev) =>
        prev.map((p) => p.id === proposalId ? { ...p, status: "applied" as const } : p)
      );
      toast.success("Applied successfully");
      return result;
    } catch (err: any) {
      toast.error(err?.message || "Apply failed");
    }
  }, []);

  const reclassify = useCallback(async (overrideType: string) => {
    if (!run) return;
    setLoading(true);
    try {
      const result = await reclassifyIngestRun(run.id, overrideType);
      setClassifyResult(result);

      if (result.status === "proposed") {
        const [ents, props] = await Promise.all([
          fetchIngestEntities(run.id),
          fetchIngestProposals(run.id),
        ]);
        setEntities(ents);
        setProposals(props);
        setRun({ ...run, status: "proposed" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Reclassification failed");
    } finally {
      setLoading(false);
    }
  }, [run]);

  const openRun = useCallback(async (runId: string) => {
    setLoading(true);
    try {
      const r = await fetchIngestRun(runId);
      const [ents, props] = await Promise.all([
        fetchIngestEntities(runId),
        fetchIngestProposals(runId),
      ]);
      setRun(r);
      setEntities(ents);
      setProposals(props);
      setClassifyResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setRun(null);
    setEntities([]);
    setProposals([]);
    setClassifyResult(null);
  }, []);

  return {
    run,
    entities,
    proposals,
    loading,
    classifyResult,
    startIngest,
    approveProposal,
    denyProposal,
    editProposal,
    batchApprove,
    batchDeny,
    applyOne,
    reclassify,
    refetchProposals,
    openRun,
    reset,
  };
}
