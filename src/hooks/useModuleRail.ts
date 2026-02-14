import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useModules } from "@/hooks/useModules";

export type ModuleKey = string;

export function useModuleRail(userId: string | null | undefined, workspaceId?: string | null) {
  const { modules, suggestedModules, activeModules, loading, refresh, activateModule } = useModules(userId);
  const [activeKey, setActiveKey] = useState<ModuleKey | null>(null);
  const [scaffold, setScaffold] = useState<any | null>(null);

  const fetchScaffold = useCallback(async (moduleKey: string) => {
    if (!userId) return;
    const query = supabase
      .from("garvis_module_scaffolds" as any)
      .select("*")
      .eq("user_id", userId)
      .eq("module_key", moduleKey);

    if (workspaceId) {
      query.eq("workspace_id", workspaceId);
    } else {
      query.is("workspace_id", null);
    }

    const { data } = await query.maybeSingle();
    setScaffold(data || null);
  }, [userId, workspaceId]);

  useEffect(() => {
    if (activeKey) fetchScaffold(activeKey);
  }, [activeKey, fetchScaffold]);

  // Default active module: first activated
  useEffect(() => {
    if (activeKey) return;
    if (activeModules.length > 0) setActiveKey(activeModules[0].module_key);
  }, [activeModules, activeKey]);

  return {
    loading,
    modules,
    suggestedModules,
    activeModules,
    activeKey,
    setActiveKey,
    scaffold,
    refresh,
    activateModule,
  };
}
