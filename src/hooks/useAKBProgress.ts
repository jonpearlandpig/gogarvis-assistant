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

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/akb/progress`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Failed to fetch AKB progress: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setData(null);
    }
    setLoading(false);
  }, []);

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
