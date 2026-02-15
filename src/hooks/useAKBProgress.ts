import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AKBDomainProgress = {
  domain_key: string;
  status: "empty" | "draft" | "complete";
  locked: boolean;
  min_met: boolean;
  progress_json: Record<string, any>;
};

export type AKBProgress = {
  coveragePercent: number;
  completedCount: number;
  total: number;
  nextDomain: string | null;
  lockable: string[];
  domains: AKBDomainProgress[];
};

const ORDERED_6 = [
  "identity",
  "goals",
  "offer",
  "audience",
  "assets",
  "financial_model",
] as const;

export function useAKBProgress(userId: string | null) {
  const [data, setData] = useState<AKBProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Fetch domain rows + approved drafts + law entries in parallel
    const [domainsRes, draftsRes, lawRes] = await Promise.all([
      supabase
        .from("akb_domains")
        .select("domain_key,status,locked,min_met,progress_json")
        .eq("user_id", userId),
      supabase
        .from("akb_drafts")
        .select("domain,status")
        .eq("user_id", userId)
        .eq("status", "approved"),
      supabase
        .from("akb_law")
        .select("domain")
        .eq("user_id", userId),
    ]);

    const domainMap = new Map(
      (domainsRes.data || []).map((r: any) => [r.domain_key, r])
    );

    // Count approved drafts per domain
    const draftCounts: Record<string, number> = {};
    for (const r of (draftsRes.data || []) as any[]) {
      if (r.domain) draftCounts[r.domain] = (draftCounts[r.domain] || 0) + 1;
    }

    // Law domains set
    const lawDomains = new Set((lawRes.data || []).map((r: any) => r.domain));

    const merged: AKBDomainProgress[] = ORDERED_6.map((k) => {
      const row = domainMap.get(k);

      // Infer status from law/drafts if no akb_domains row
      let status: "empty" | "draft" | "complete" = "empty";
      let locked = false;
      let min_met = false;
      let progress_json: Record<string, any> = {};

      if (row) {
        status = row.status as AKBDomainProgress["status"];
        locked = row.locked ?? false;
        min_met = row.min_met ?? false;
        progress_json = (row.progress_json as Record<string, any>) ?? {};
      } else {
        // Fallback inference
        if (lawDomains.has(k)) {
          status = "complete";
        } else if ((draftCounts[k] || 0) > 0) {
          status = "draft";
        }
      }

      // Client-side min_met inference: at least 1 approved draft or law entry
      const hasApprovedOrLaw = (draftCounts[k] || 0) >= 1 || lawDomains.has(k);
      if (hasApprovedOrLaw) min_met = true;

      return { domain_key: k, status, locked, min_met, progress_json };
    });

    const completedCount = merged.filter(
      (d) => d.status === "complete" || d.locked
    ).length;
    const total = merged.length;
    const coveragePercent = Math.round((completedCount / total) * 100);

    const lockable = merged
      .filter((d) => d.min_met && !d.locked)
      .map((d) => d.domain_key);
    const nextDomain =
      merged.find((d) => !d.locked && !d.min_met)?.domain_key || null;

    setData({
      coveragePercent,
      completedCount,
      total,
      nextDomain,
      lockable,
      domains: merged,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const lockDomain = useCallback(
    async (domainKey: string) => {
      if (!userId) return;
      const { error } = await supabase.rpc("akb_lock_domain", {
        p_domain_key: domainKey,
      });
      if (error) throw error;
      await refetch();
    },
    [userId, refetch]
  );

  return { data, loading, refetch, lockDomain };
}
