import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IngestProposal, IngestEntity } from "@/lib/ingest-client";

const TYPE_LABELS: Record<string, string> = {
  akb_draft: "AKB Draft",
  project_scaffold: "Project",
  artifact_seed: "Artifact",
  template_clone: "Template Clone",
};

const CLASSIFY_OPTIONS = [
  "executive_summary",
  "pitch_deck",
  "creative_brief",
  "ip_bible",
  "contract",
  "financial_model",
  "org_chart",
  "misc",
];

interface IngestProposalPanelProps {
  run: { id: string; status: string; detected_types: string[] } | null;
  entities: IngestEntity[];
  proposals: IngestProposal[];
  loading: boolean;
  classifyResult: any;
  onApprove: (proposal: IngestProposal) => Promise<void>;
  onDeny: (proposalId: string) => void;
  onReclassify: (overrideType: string) => void;
  onEdit: (proposalId: string, editedSummary: string, editedPayload: any) => Promise<void>;
  onBatchApprove: (ids: string[]) => Promise<void>;
  onBatchDeny: (ids: string[]) => Promise<void>;
  onApply: (proposalId: string) => Promise<void>;
  onClose: () => void;
}

export function IngestProposalPanel({
  run,
  entities,
  proposals,
  loading,
  classifyResult,
  onApprove,
  onDeny,
  onReclassify,
  onEdit,
  onBatchApprove,
  onBatchDeny,
  onApply,
  onClose,
}: IngestProposalPanelProps) {
  const [tab, setTab] = useState<"drafts" | "projects" | "artifacts" | "entities">("drafts");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<IngestProposal | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [editPayload, setEditPayload] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

  const canApplySelectedIds = useMemo(() => {
    const map = new Map(proposals.map((p) => [p.id, p]));
    return selectedIds
      .map((id) => map.get(id))
      .filter(Boolean)
      .filter((p) => (p as IngestProposal).status === "approved" || (p as IngestProposal).status === "edited")
      .map((p) => (p as IngestProposal).id);
  }, [selectedIds, proposals]);

  if (!run) return null;

  // Confidence gating
  if (run.status === "needs_classification") {
    return (
      <div className="w-full rounded-2xl border border-border bg-background/40 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-foreground">Low Confidence</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="text-sm text-muted-foreground">
          GARVIS couldn't confidently classify this document. Please confirm:
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {CLASSIFY_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onReclassify(opt)}
              disabled={loading}
              className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted/40 text-foreground disabled:opacity-40"
            >
              {opt.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {loading && <div className="mt-3 text-sm text-muted-foreground">Re-classifying…</div>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-border bg-background/40 p-4 shadow-sm">
        <div className="text-sm text-muted-foreground">Classifying & extracting…</div>
      </div>
    );
  }

  const draftProposals = proposals.filter((p) => p.proposal_type === "akb_draft");
  const projectProposals = proposals.filter(
    (p) => p.proposal_type === "project_scaffold" || p.proposal_type === "template_clone"
  );
  const artifactProposals = proposals.filter((p) => p.proposal_type === "artifact_seed");

  const openEdit = (p: IngestProposal) => {
    setEditing(p);
    setEditSummary(p.edited_summary ?? p.summary ?? "");
    setEditPayload(JSON.stringify(p.edited_payload_json ?? p.payload_json ?? {}, null, 2));
  };

  const saveEdit = async () => {
    if (!editing) return;
    let parsed: any = {};
    try {
      parsed = JSON.parse(editPayload || "{}");
    } catch {
      toast.error("Edited payload must be valid JSON");
      return;
    }
    await onEdit(editing.id, editSummary, parsed);
    setEditing(null);
    toast.success("Saved edits");
  };




  const bulkApply = async () => {
    if (bulkApplying) return;
    if (canApplySelectedIds.length === 0) {
      toast.message("Nothing selected is ready to apply");
      return;
    }

    setBulkApplying(true);
    try {
      for (const id of canApplySelectedIds) {
        await onApply(id);
      }
      toast.success(`Applied ${canApplySelectedIds.length} item(s)`);
      setSelected({});
    } catch (e: any) {
      toast.error(e?.message || "Bulk apply failed");
    } finally {
      setBulkApplying(false);
    }
  };

  // Auto-select the first non-empty tab
  const autoTab = draftProposals.length > 0 ? "drafts"
    : projectProposals.length > 0 ? "projects"
    : artifactProposals.length > 0 ? "artifacts"
    : entities.length > 0 ? "entities"
    : "drafts";
  const activeTab = tab === "drafts" && draftProposals.length === 0 ? autoTab : tab;

  // Only show tabs that have content
  const visibleTabs = [
    draftProposals.length > 0 && { key: "drafts" as const, label: `Drafts (${draftProposals.length})` },
    projectProposals.length > 0 && { key: "projects" as const, label: `Projects (${projectProposals.length})` },
    artifactProposals.length > 0 && { key: "artifacts" as const, label: `Artifacts (${artifactProposals.length})` },
    entities.length > 0 && { key: "entities" as const, label: `Entities (${entities.length})` },
  ].filter(Boolean) as { key: typeof tab; label: string }[];

  return (
    <div className="w-full rounded-2xl border border-border bg-background/40 p-4 shadow-sm">
      {/* Header — compact */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">
          What I Found
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}
            {entities.length > 0 && ` · ${entities.length} entities`}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>

      {/* Batch toolbar — only visible when items are checked */}
      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="text-xs text-muted-foreground">{selectedIds.length} selected</div>
          <button
            type="button"
            onClick={() => onBatchApprove(selectedIds).then(() => setSelected({}))}
            className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted/40 text-foreground"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => onBatchDeny(selectedIds).then(() => setSelected({}))}
            className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted/40 text-muted-foreground"
          >
            Deny
          </button>
          {canApplySelectedIds.length > 0 && (
            <button
              type="button"
              disabled={bulkApplying}
              onClick={bulkApply}
              className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted/40 text-foreground disabled:opacity-40"
            >
              {bulkApplying ? "Applying…" : `Apply (${canApplySelectedIds.length})`}
            </button>
          )}
        </div>
      )}

      {/* Tabs — only show if more than one category has content */}
      {visibleTabs.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full transition-colors",
                activeTab === t.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        {activeTab !== "entities" &&
          (activeTab === "drafts" ? draftProposals
            : activeTab === "projects" ? projectProposals
            : artifactProposals
          ).map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              checked={!!selected[p.id]}
              onCheckChange={(v) => setSelected((s) => ({ ...s, [p.id]: v }))}
              onApprove={async () => { await onApprove(p); }}
              onDeny={() => onDeny(p.id)}
              onEdit={() => openEdit(p)}
              onApply={async () => { await onApply(p.id); }}
            />
          ))}

        {activeTab === "entities" &&
          entities.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-background/30 p-3">
              <div className="text-sm font-medium text-foreground">{e.entity_name}</div>
              <div className="text-xs text-muted-foreground">
                {e.entity_type} · {Math.round((e.confidence || 0) * 100)}%
              </div>
            </div>
          ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-4 shadow-lg">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">Edit Proposal</div>
                <div className="text-xs text-muted-foreground">
                  Changes stay as a proposal until you approve & apply.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-muted-foreground">Summary</div>
            <input
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-foreground"
            />

            <div className="mt-3">
              <div className="text-xs text-muted-foreground">Payload (JSON)</div>
              <textarea
                value={editPayload}
                onChange={(e) => setEditPayload(e.target.value)}
                rows={14}
                className="mt-1 w-full rounded-xl border border-border bg-muted/20 px-3 py-2 font-mono text-xs text-foreground"
              />
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted/40 text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted/40 text-foreground"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProposalCard({
  proposal,
  checked,
  onCheckChange,
  onApprove,
  onDeny,
  onEdit,
  onApply,
}: {
  proposal: IngestProposal;
  checked: boolean;
  onCheckChange: (v: boolean) => void;
  onApprove: () => Promise<void>;
  onDeny: () => void;
  onEdit: () => void;
  onApply: () => Promise<void>;
}) {
  const isApplied = proposal.status === "applied";
  const isDenied = proposal.status === "denied";
  const isApprovedOrEdited = proposal.status === "approved" || proposal.status === "edited";
  const canApply = isApprovedOrEdited;
  const isTemplate = proposal.proposal_type === "template_clone";
  const displaySummary = proposal.edited_summary ?? proposal.summary ?? "(Untitled)";
  const displayTarget = proposal.target ? ` → ${proposal.target}` : "";
  const bullets = (proposal.edited_payload_json?.bullets || proposal.payload_json?.bullets) as
    | string[]
    | undefined;

  return (
    <div
      className={cn(
        "rounded-xl border border-border p-3",
        "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between",
        isApplied && "bg-muted/10 opacity-80",
        isDenied && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckChange(e.target.checked)}
          className="mt-1 shrink-0"
          disabled={isApplied}
        />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium text-foreground">{displaySummary}</div>
            {isApplied && (
              <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                APPLIED
              </span>
            )}
            {proposal.status !== "proposed" && !isApplied && (
              <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                {proposal.status.toUpperCase()}
              </span>
            )}
          </div>

          <div className="mt-0.5 text-xs text-muted-foreground">
            {(TYPE_LABELS[proposal.proposal_type] || proposal.proposal_type) + displayTarget}
          </div>

          {proposal.source_excerpts?.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">From your upload:</span>{" "}
              {proposal.source_excerpts.slice(0, 2).map((s: any, i: number) => (
                <span key={i} className="mr-2">
                  "{String(s.excerpt || "").slice(0, 80)}
                  {String(s.excerpt || "").length > 80 ? "…" : ""}"
                </span>
              ))}
            </div>
          )}

          {Array.isArray(bullets) && bullets.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {bullets.slice(0, 4).map((b, i) => (
                <div key={i}>• {b}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isApplied ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onEdit}
            className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted/40 text-foreground"
            disabled={isDenied}
          >
            Edit
          </button>

          {/* One-click Approve & Apply for non-draft proposals still in proposed state */}
          {proposal.status === "proposed" && proposal.proposal_type !== "akb_draft" && (
            <button
              type="button"
              onClick={async () => {
                await onApprove();
                await onApply();
              }}
              className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted/40 text-foreground"
            >
              Approve & Apply
            </button>
          )}

          {/* Standard Approve for akb_draft proposals still in proposed state */}
          {proposal.status === "proposed" && proposal.proposal_type === "akb_draft" && (
            <button
              type="button"
              onClick={onApprove}
              className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted/40 text-foreground"
            >
              Approve
            </button>
          )}

          {/* Apply button when already approved/edited */}
          {canApply && (
            <button
              type="button"
              onClick={onApply}
              className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted/40 text-foreground"
            >
              {isTemplate ? "Clone Template" : "Apply"}
            </button>
          )}

          {!isDenied && (
            <button
              type="button"
              onClick={onDeny}
              className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted/40 text-muted-foreground"
            >
              Deny
            </button>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground sm:text-right">Applied</div>
      )}
    </div>
  );
}
