import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DomainStatus = {
  domain_key: string;
  status: "empty" | "draft" | "complete";
  completed_at: string | null;
};

const ORDERED_DOMAINS = [
  "identity",
  "goals",
  "offer",
  "audience",
  "assets",
  "financial_model",
] as const;

export type AKBDomainState = {
  domains: DomainStatus[];
  completedDomains: DomainStatus[];
  completedCount: number;
  total: number;
  coveragePercent: number;
  nextDomain: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

export function useAKBDomains(userId: string | null): AKBDomainState {
  const [domains, setDomains] = useState<DomainStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const prevCount = useRef(0);

  const refetch = useCallback(async () => {
    if (!userId) {
      setDomains(ORDERED_DOMAINS.map((d) => ({ domain_key: d, status: "empty" as const, completed_at: null })));
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch all three sources in parallel
    const [domainsRes, draftsRes, lawRes] = await Promise.all([
      supabase
        .from("akb_domains")
        .select("domain_key, status, completed_at")
        .eq("user_id", userId),
      supabase
        .from("akb_drafts")
        .select("domain, status")
        .eq("user_id", userId)
        .not("status", "eq", "rejected"),
      supabase
        .from("akb_law")
        .select("domain")
        .eq("user_id", userId),
    ]);

    const domainMap = new Map((domainsRes.data || []).map((r: any) => [r.domain_key, r]));

    // Build sets of domains that have law entries or non-rejected drafts
    const lawDomains = new Set((lawRes.data || []).map((r: any) => r.domain));
    const draftDomains = new Set((draftsRes.data || []).map((r: any) => r.domain));

    const merged: DomainStatus[] = ORDERED_DOMAINS.map((d) => {
      const row = domainMap.get(d);
      if (row) {
        return { domain_key: d, status: row.status as DomainStatus["status"], completed_at: row.completed_at };
      }
      // Fallback: infer status from law/drafts when akb_domains row doesn't exist
      if (lawDomains.has(d)) {
        return { domain_key: d, status: "complete" as const, completed_at: null };
      }
      if (draftDomains.has(d)) {
        return { domain_key: d, status: "draft" as const, completed_at: null };
      }
      return { domain_key: d, status: "empty" as const, completed_at: null };
    });

    setDomains(merged);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const completedDomains = domains.filter((d) => d.status === "complete");
  const completedCount = completedDomains.length;
  const total = ORDERED_DOMAINS.length;
  const coveragePercent = Math.round((completedCount / total) * 100);

  const nextDomain = domains.find((d) => d.status !== "complete")?.domain_key ?? null;

  return {
    domains,
    completedDomains,
    completedCount,
    total,
    coveragePercent,
    nextDomain,
    loading,
    refetch,
  };
}
