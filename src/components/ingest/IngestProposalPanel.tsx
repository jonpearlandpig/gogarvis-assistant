import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { IngestEntity, IngestProposal } from "@/lib/ingest-client";

const TYPE_LABELS: Record<string, string> = {
  akb_draft: "AKB Draft",
  project_scaffold: "Project",
  artifact_seed: "Artifact",
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
  industryTemplates?: string[];
  onApprove: (proposal: IngestProposal) => void;
  onDeny: (proposalId: string) => void;
  onReclassify: (overrideType: string) => void;
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
  onClose,
}: IngestProposalPanelProps) {
  const [tab, setTab] = useState<"drafts" | "projects" | "artifacts" | "entities">("drafts");

  if (!run) return null;

  // Confidence gating: ask user to pick type
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
        <div className="text-xs font-mono text-foreground mb-2">
          Is this primarily:
        </div>
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
  const projectProposals = proposals.filter((p) => p.proposal_type === "project_scaffold");
  const artifactProposals = proposals.filter((p) => p.proposal_type === "artifact_seed");
  const industryTemplates = classifyResult?.industry_templates || [];

  const entitySummary = entities.length > 0
    ? `${entities.length} entities`
    : "No entities";
  const projectCount = projectProposals.length;
  const contactCount = entities.filter((e) => e.entity_type === "person_role").length;
  const ipCount = entities.filter((e) => e.entity_type === "ip_title").length;

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
              tab === t.key
                ? "bg-muted text-foreground"
                : "hover:bg-muted/40 text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="max-h-[500px]">
        <div className="space-y-2">
          {tab === "drafts" && draftProposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              onApprove={() => onApprove(p)}
              onDeny={() => onDeny(p.id)}
            />
          ))}

          {tab === "projects" && projectProposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              onApprove={() => onApprove(p)}
              onDeny={() => onDeny(p.id)}
            />
          ))}

          {tab === "artifacts" && artifactProposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              onApprove={() => onApprove(p)}
              onDeny={() => onDeny(p.id)}
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
    </div>
  );
}

function ProposalCard({
  proposal,
  onApprove,
  onDeny,
}: {
  proposal: IngestProposal;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const isDone = proposal.status === "approved" || proposal.status === "denied";

  return (
    <div className={cn("border border-border rounded p-2", isDone && "opacity-50")}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono text-foreground">{proposal.summary}</div>
        <div className="text-[10px] text-muted-foreground">
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
      {proposal.payload_json?.bullets && (
        <div className="mt-1 text-[11px] text-foreground space-y-0.5">
          {(proposal.payload_json.bullets as string[]).slice(0, 4).map((b, i) => (
            <div key={i}>• {b}</div>
          ))}
        </div>
      )}

      {/* Status badge */}
      {isDone && (
        <div className={cn(
          "mt-1 text-[10px] font-mono",
          proposal.status === "approved" ? "text-green-600" : "text-red-500"
        )}>
          {proposal.status.toUpperCase()}
        </div>
      )}

      {/* Actions */}
      {!isDone && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={onApprove}
            className="text-xs border border-border rounded px-2 py-1 hover:bg-muted/40 text-foreground"
          >
            Approve
          </button>
          <button
            onClick={onDeny}
            className="text-xs border border-border rounded px-2 py-1 hover:bg-muted/40 text-muted-foreground"
          >
            Deny
          </button>
        </div>
      )}
    </div>
  );
}
