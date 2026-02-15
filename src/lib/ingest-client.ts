import { supabase } from "@/integrations/supabase/client";

export type IngestRun = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  source_file_ids: string[];
  detected_types: string[];
  status: string;
  created_at: string;
};

export type IngestEntity = {
  id: string;
  ingest_id: string;
  entity_type: string;
  entity_name: string;
  payload_json: any;
  confidence: number;
};

export type IngestProposal = {
  id: string;
  ingest_id: string;
  proposal_type: "akb_draft" | "project_scaffold" | "artifact_seed" | "template_clone";
  target: string;
  summary: string;
  payload_json: any;
  source_excerpts: any[];
  status: "proposed" | "approved" | "denied" | "edited" | "applied";
  edited_summary?: string | null;
  edited_payload_json?: any | null;
  edited_at?: string | null;
  applied_at?: string | null;
};

export async function createIngestRun(params: {
  userId: string;
  workspaceId: string | null;
  sourceFileIds: string[];
}): Promise<IngestRun> {
  const { data, error } = await supabase
    .from("ingest_runs")
    .insert({
      user_id: params.userId,
      workspace_id: params.workspaceId,
      source_file_ids: params.sourceFileIds,
      status: "pending",
    } as any)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as any;
}

export async function triggerClassification(ingestRunId: string) {
  const { data, error } = await supabase.functions.invoke("ingest-classify", {
    body: { ingest_run_id: ingestRunId },
  });

  if (error) throw new Error(error.message || "Classification failed");
  return data;
}

export async function fetchIngestRun(ingestRunId: string): Promise<IngestRun | null> {
  const { data } = await supabase
    .from("ingest_runs")
    .select("*")
    .eq("id", ingestRunId)
    .single();
  return (data as any) || null;
}

export async function fetchIngestEntities(ingestId: string): Promise<IngestEntity[]> {
  const { data } = await supabase
    .from("ingest_entities")
    .select("*")
    .eq("ingest_id", ingestId)
    .order("confidence", { ascending: false });
  return (data as any[]) || [];
}

export async function fetchIngestProposals(ingestId: string): Promise<IngestProposal[]> {
  const { data } = await supabase
    .from("ingest_proposals")
    .select("*")
    .eq("ingest_id", ingestId)
    .order("created_at", { ascending: true });
  return (data as any[]) || [];
}

export async function updateProposalStatus(
  proposalId: string,
  status: "approved" | "denied" | "edited",
  editedPayload?: any
) {
  const update: any = { status };
  if (editedPayload) update.payload_json = editedPayload;

  const { error } = await supabase
    .from("ingest_proposals")
    .update(update)
    .eq("id", proposalId);

  if (error) throw new Error(error.message);
}

export async function applyApprovedProposal(proposal: IngestProposal, userId: string, workspaceId: string | null) {
  if (proposal.proposal_type === "akb_draft") {
    const payload = proposal.edited_payload_json || proposal.payload_json;
    const { error } = await supabase.from("akb_drafts").insert({
      user_id: userId,
      workspace_id: workspaceId,
      domain: proposal.target,
      title: proposal.summary,
      body_md: (payload.bullets || []).map((b: string) => `- ${b}`).join("\n"),
      tags: [],
      sources: proposal.source_excerpts.map((s: any) => ({
        upload_id: s.file_id,
        note: s.excerpt || "From ingest",
      })),
      proposed_by: "garvis_ingest",
      status: "draft",
    } as any);

    if (error) throw new Error(error.message);
  } else if (proposal.proposal_type === "project_scaffold") {
    const { error } = await supabase.from("akb_projects").insert({
      user_id: userId,
      name: proposal.target,
      status: "active",
    } as any);

    if (error) throw new Error(error.message);
  } else if (proposal.proposal_type === "artifact_seed") {
    const { error } = await supabase.from("artifacts").insert({
      user_id: userId,
      title: proposal.summary,
      type: "text",
      status: "DRAFT",
    } as any);

    if (error) throw new Error(error.message);
  }
}

export async function reclassifyIngestRun(ingestRunId: string, overrideType: string) {
  await supabase.from("ingest_runs").update({
    detected_types: [overrideType],
    status: "pending",
  } as any).eq("id", ingestRunId);

  return triggerClassification(ingestRunId);
}

// --- New: Edit, Batch, Apply via RPCs ---

export async function updateProposalEdit(args: {
  proposalId: string;
  editedSummary: string;
  editedPayload: any;
}) {
  const { error } = await supabase.rpc("ingest_update_proposal" as any, {
    p_proposal_id: args.proposalId,
    p_edited_summary: args.editedSummary,
    p_edited_payload: args.editedPayload,
  });
  if (error) throw new Error(error.message);
}

export async function batchSetProposalStatus(args: {
  ingestId: string;
  ids: string[];
  status: "approved" | "denied";
}) {
  const { error } = await supabase.rpc("ingest_batch_set_status" as any, {
    p_ingest_id: args.ingestId,
    p_ids: args.ids,
    p_status: args.status,
  });
  if (error) throw new Error(error.message);
}

export async function applyProposal(proposalId: string) {
  const { data, error } = await supabase.rpc("ingest_apply_proposal" as any, {
    p_proposal_id: proposalId,
  });
  if (error) throw new Error(error.message);
  return data;
}
