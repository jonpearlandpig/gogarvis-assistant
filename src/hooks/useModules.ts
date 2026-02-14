import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ModuleStatus = "inactive" | "suggested" | "activated";

export interface UserModule {
  id: string;
  module_key: string;
  status: ModuleStatus;
  confidence: number;
  activation_score: number;
  activated_at: string | null;
  display_name?: string;
  description?: string;
}

export function useModules(userId: string | null | undefined) {
  const [modules, setModules] = useState<UserModule[]>([]);
  const [allModules, setAllModules] = useState<
    { module_key: string; display_name: string; description: string; activation_threshold: number }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const fetchModules = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [{ data: defs }, { data: userMods }] = await Promise.all([
      supabase.from("garvis_modules").select("*"),
      supabase.from("garvis_user_modules").select("*").eq("user_id", userId),
    ]);

    setAllModules((defs as any[]) || []);

    const merged: UserModule[] = ((defs as any[]) || []).map((def: any) => {
      const um = ((userMods as any[]) || []).find(
        (u: any) => u.module_key === def.module_key
      );
      return {
        id: um?.id || "",
        module_key: def.module_key,
        status: (um?.status || "inactive") as ModuleStatus,
        confidence: um?.confidence || 0,
        activation_score: um?.activation_score || 0,
        activated_at: um?.activated_at || null,
        display_name: def.display_name,
        description: def.description,
      };
    });

    setModules(merged);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const activateModule = useCallback(
    async (moduleKey: string) => {
      if (!userId) return;

      await supabase.from("garvis_user_modules").upsert(
        {
          user_id: userId,
          module_key: moduleKey,
          status: "activated",
          activated_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id,module_key" }
      );

      await fetchModules();
    },
    [userId, fetchModules]
  );

  const suggestedModules = modules.filter((m) => m.status === "suggested");
  const activeModules = modules.filter((m) => m.status === "activated");

  return {
    modules,
    allModules,
    suggestedModules,
    activeModules,
    loading,
    refresh: fetchModules,
    activateModule,
  };
}
