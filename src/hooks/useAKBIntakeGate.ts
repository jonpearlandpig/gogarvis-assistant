import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AKBIntakeGate = {
  hasFirstDataset: boolean;
  uploadCount: number;
  draftCount: number;
  loading: boolean;
  refetch: () => Promise<void>;
};

export function useAKBIntakeGate(userId: string | null, workspaceId?: string | null): AKBIntakeGate {
  const [uploadCount, setUploadCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setUploadCount(0);
      setDraftCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);

    const scopeEq = workspaceId ? { workspace_id: workspaceId } : {};

    const [u, d] = await Promise.all([
      supabase
        .from("akb_uploads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .match(scopeEq),
      supabase
        .from("akb_drafts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .match(scopeEq),
    ]);

    setUploadCount(u.count || 0);
    setDraftCount(d.count || 0);
    setLoading(false);
  }, [userId, workspaceId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    hasFirstDataset: (uploadCount + draftCount) > 0,
    uploadCount,
    draftCount,
    loading,
    refetch,
  };
}
