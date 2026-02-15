import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  createIngestRun,
  triggerClassification,
  fetchIngestEntities,
  fetchIngestProposals,
  updateProposalStatus,
  applyApprovedProposal,
  reclassifyIngestRun,
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
    if (!userId || sourceFileIds.length === 0) return;
    setLoading(true);

    try {
      const newRun = await createIngestRun({ userId, workspaceId, sourceFileIds });
      setRun(newRun);

      const result = await triggerClassification(newRun.id);
      setClassifyResult(result);

      if (result.status === "needs_classification") {
        setRun({ ...newRun, status: "needs_classification" });
        toast.info("Low confidence — please confirm the document type.");
        setLoading(false);
        return;
      }

      // Fetch entities and proposals
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
    } catch (err: any) {
      toast.error(err?.message || "Ingest failed");
      if (run) setRun({ ...run, status: "failed" });
    } finally {
      setLoading(false);
    }
  }, [userId, workspaceId]);

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
    reclassify,
    reset,
  };
}
