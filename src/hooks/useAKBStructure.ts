import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StructureEntry } from "@/components/akb/AKBStructurePanel";

/**
 * Aggregates drafts + law into a flat StructureEntry[] for the AKB Structure Panel.
 * Law entries are "complete", drafts are "draft".
 */
export function useAKBStructure(userId: string | null, workspaceId: string | null) {
  const [entries, setEntries] = useState<StructureEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const scopeEq = workspaceId ? { workspace_id: workspaceId } : {};

    const [draftsRes, lawRes] = await Promise.all([
      supabase
        .from("akb_drafts")
        .select("domain, title, proposed_by, status, created_at")
        .match(scopeEq)
        .not("status", "eq", "rejected")
        .order("created_at", { ascending: false }),
      supabase
        .from("akb_law")
        .select("domain, title, sources, created_at")
        .match(scopeEq)
        .order("created_at", { ascending: false }),
    ]);

    const result: StructureEntry[] = [];

    // Law entries are always "complete"
    for (const l of lawRes.data || []) {
      result.push({
        domain_key: l.domain,
        field_key: l.title,
        value: "",
        status: "complete",
        source_type: guessSource(l.sources),
        updated_at: l.created_at,
      });
    }

    // Drafts that aren't already in law (by domain+title)
    const lawKeys = new Set(result.map((r) => `${r.domain_key}::${r.field_key}`));
    for (const d of draftsRes.data || []) {
      const key = `${d.domain}::${d.title}`;
      if (lawKeys.has(key)) continue;
      result.push({
        domain_key: d.domain,
        field_key: d.title,
        value: "",
        status: "draft",
        source_type: mapProposedBy(d.proposed_by),
        updated_at: d.created_at,
      });
    }

    setEntries(result);
    setLoading(false);
  }, [userId, workspaceId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { entries, loading, refetch };
}

function guessSource(sources: any): "chat" | "upload" | "url" {
  if (!sources || !Array.isArray(sources)) return "chat";
  const first = sources[0];
  if (first?.upload_id) return "upload";
  if (first?.url) return "url";
  return "chat";
}

function mapProposedBy(v: string): "chat" | "upload" | "url" {
  if (v === "human") return "chat";
  if (v === "upload") return "upload";
  if (v === "url") return "url";
  return "chat";
}
