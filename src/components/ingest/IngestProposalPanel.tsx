import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IngestEntity, IngestProposal } from "@/lib/ingest-client";

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
  onApprove: (proposal: IngestProposal) => void;
  onDeny: (proposalId: string) => void;
  onReclassify: (overrideType: string) => void;
  onEdit: (proposalId: string, editedSummary: string, editedPayload: any) => Promise<void>;
  onBatchApprove: (ids: string[]) => Promise<void>;
  onBatchDeny: (ids: string[]) => Promise<void>;
  onApply: (proposalId: string) => Promise<any>;
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

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

  if (!run) return null;

  // Confidence gating
  if (run.status === "needs_classification") {
    return (
      <div className="w-[480px] border-l border-border bg-background p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-mono text-foreground">Low Confidence</div>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <p className="text-xs text-muted-foreground">
          GARVIS couldn't confidently classify this document. Please confirm:
        </p>
        <div className="text-xs font-mono text-foreground mb-2">Is this primarily:</div>
        <div className="flex flex-wrap gap-2">
          {CLASSIFY_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => onReclassify(opt)}
              disabled={loading}
              className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted/40 text-foreground disabled:opacity-40"
            >
              {opt.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        {loading && (
          <div className="text-xs text-muted-foreground animate-pulse">Re-classifying…</div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-[480px] border-l border-border bg-background p-4">
        <div className="text-xs font-mono text-foreground animate-pulse">
          Classifying & extracting…
        </div>
      </div>
    );
  }

  const draftProposals = proposals.filter((p) => p.proposal_type === "akb_draft");
  const projectProposals = proposals.filter((p) => p.proposal_type === "project_scaffold" || p.proposal_type === "template_clone");
  const artifactProposals = proposals.filter((p) => p.proposal_type === "artifact_seed");
  const industryTemplates = classifyResult?.industry_templates || [];

  const entitySummary = entities.length > 0 ? `${entities.length} entities` : "No entities";
  const projectCount = projectProposals.length;
  const contactCount = entities.filter((e) => e.entity_type === "person_role").length;
  const ipCount = entities.filter((e) => e.entity_type === "ip_title").length;

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
  };

  const currentTabProposals = tab === "drafts" ? draftProposals
    : tab === "projects" ? projectProposals
    : tab === "artifacts" ? artifactProposals
    : [];

  return (
    <div className="w-[480px] border-l border-border bg-background p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-mono text-foreground">What I Found</div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>

      {/* Summary card */}
      <div className="border border-border rounded p-3 space-y-1">
        <div className="text-xs text-foreground">
          {projectCount > 0 && <span>{projectCount} project{projectCount > 1 ? "s" : ""} • </span>}
          {contactCount > 0 && <span>{contactCount} contact{contactCount > 1 ? "s" : ""} • </span>}
          {ipCount > 0 && <span>{ipCount} IP item{ipCount > 1 ? "s" : ""} • </span>}
          {entitySummary}
        </div>
        {run.detected_types.length > 0 && (
          <div className="text-[10px] text-muted-foreground">
            Detected: {run.detected_types.join(", ").replace(/_/g, " ")}
          </div>
        )}
        {industryTemplates.length > 0 && (
          <div className="text-[10px] text-muted-foreground">
            Closest templates: {industryTemplates.join(", ")}
          </div>
        )}
      </div>

      {/* Batch toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
          <button
            onClick={() => onBatchApprove(selectedIds).then(() => setSelected({}))}
            className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted/40 text-foreground"
          >
            Approve Selected
          </button>
          <button
            onClick={() => onBatchDeny(selectedIds).then(() => setSelected({}))}
            className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted/40 text-muted-foreground"
          >
            Deny Selected
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {([
          { key: "drafts" as const, label: `AKB Drafts (${draftProposals.length})` },
          { key: "projects" as const, label: `Projects (${projectProposals.length})` },
          { key: "artifacts" as const, label: `Artifacts (${artifactProposals.length})` },
          { key: "entities" as const, label: `Entities (${entities.length})` },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "text-xs px-2 py-1 rounded border border-border",
              tab === t.key ? "bg-muted text-foreground" : "hover:bg-muted/40 text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="max-h-[500px]">
        <div className="space-y-2">
          {tab !== "entities" && currentTabProposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              checked={!!selected[p.id]}
              onCheckChange={(v) => setSelected((s) => ({ ...s, [p.id]: v }))}
              onApprove={() => onApprove(p)}
              onDeny={() => onDeny(p.id)}
              onEdit={() => openEdit(p)}
              onApply={() => onApply(p.id)}
            />
          ))}

          {tab === "entities" && entities.map((e) => (
            <div key={e.id} className="border border-border rounded p-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-foreground">{e.entity_name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {e.entity_type} • {Math.round(e.confidence * 100)}%
                </div>
              </div>
              {e.payload_json?.excerpt && (
                <div className="text-[10px] text-muted-foreground mt-1 italic">
                  "{e.payload_json.excerpt}"
                </div>
              )}
            </div>
          ))}

          {tab === "drafts" && draftProposals.length === 0 && (
            <div className="text-xs text-muted-foreground">No AKB drafts proposed.</div>
          )}
          {tab === "projects" && projectProposals.length === 0 && (
            <div className="text-xs text-muted-foreground">No projects detected.</div>
          )}
          {tab === "artifacts" && artifactProposals.length === 0 && (
            <div className="text-xs text-muted-foreground">No artifacts suggested.</div>
          )}
        </div>
      </ScrollArea>

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
                onClick={() => setEditing(null)}
                className="rounded px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>

            <label className="block text-xs text-muted-foreground">Summary</label>
            <input
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-foreground"
            />

            <div className="mt-3">
              <label className="block text-xs text-muted-foreground">Payload (JSON)</label>
              <textarea
                value={editPayload}
                onChange={(e) => setEditPayload(e.target.value)}
                rows={14}
                className="mt-1 w-full rounded-xl border border-border bg-muted/20 px-3 py-2 font-mono text-xs text-foreground"
              />
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setEditing(null)}
                className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted/40 text-muted-foreground"
              >
                Cancel
              </button>
              <button
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
  onApprove: () => void;
  onDeny: () => void;
  onEdit: () => void;
  onApply: () => void;
}) {
  const isDone = proposal.status === "applied";
  const canApply = proposal.status === "approved" || proposal.status === "edited";
  const isTemplate = proposal.proposal_type === "template_clone";
  const displaySummary = proposal.edited_summary ?? proposal.summary;

  return (
    <div className={cn("border border-border rounded p-2", isDone && "opacity-50")}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckChange(e.target.checked)}
          className="mt-1 shrink-0"
          disabled={isDone}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-foreground truncate">{displaySummary}</div>
            <div className="text-[10px] text-muted-foreground shrink-0 ml-2">
              {TYPE_LABELS[proposal.proposal_type] || proposal.proposal_type} → {proposal.target}
            </div>
          </div>

          {/* Source excerpts */}
          {proposal.source_excerpts?.length > 0 && (
            <div className="mt-1 space-y-0.5">
              <div className="text-[10px] text-muted-foreground font-mono">From your upload:</div>
              {proposal.source_excerpts.slice(0, 2).map((s: any, i: number) => (
                <div key={i} className="text-[10px] text-muted-foreground italic pl-2">
                  "{(s.excerpt || "").slice(0, 80)}{(s.excerpt || "").length > 80 ? "…" : ""}"
                </div>
              ))}
            </div>
          )}

          {/* Bullets for AKB drafts */}
          {(proposal.edited_payload_json?.bullets || proposal.payload_json?.bullets) && (
            <div className="mt-1 text-[11px] text-foreground space-y-0.5">
              {((proposal.edited_payload_json?.bullets || proposal.payload_json?.bullets) as string[]).slice(0, 4).map((b, i) => (
                <div key={i}>• {b}</div>
              ))}
            </div>
          )}

          {/* Status badge */}
          {(proposal.status !== "proposed") && (
            <div className={cn(
              "mt-1 text-[10px] font-mono",
              proposal.status === "approved" ? "text-green-600" : "",
              proposal.status === "denied" ? "text-red-500" : "",
              proposal.status === "edited" ? "text-yellow-600" : "",
              proposal.status === "applied" ? "text-blue-600" : "",
            )}>
              {proposal.status.toUpperCase()}
            </div>
          )}

          {/* Actions */}
          {!isDone && (
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={onEdit}
                className="text-xs border border-border rounded px-2 py-1 hover:bg-muted/40 text-foreground"
              >
                Edit
              </button>
              {proposal.status !== "approved" && proposal.status !== "edited" && (
                <button
                  onClick={onApprove}
                  className="text-xs border border-border rounded px-2 py-1 hover:bg-muted/40 text-foreground"
                >
                  Approve
                </button>
              )}
              {proposal.status !== "denied" && (
                <button
                  onClick={onDeny}
                  className="text-xs border border-border rounded px-2 py-1 hover:bg-muted/40 text-muted-foreground"
                >
                  Deny
                </button>
              )}
              {canApply && (
                <button
                  onClick={onApply}
                  className="text-xs border border-border rounded px-2 py-1 hover:bg-muted/40 text-foreground font-medium"
                >
                  {isTemplate ? "Clone Template" : "Apply"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
