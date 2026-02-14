import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export const JOURNAL_ACTIVATION_COPY = {
  suggest: [
    "There's insight here that could strengthen your operating system.",
    "Would you like to activate Journal to capture reflections like this in a structured way?",
    "If yes, reply: Activate Journal",
  ],
  confirm: [
    "Journal activated.",
    "Reflections can now be captured, structured, and revisited when useful.",
    "You remain in control of what gets saved.",
  ],
  savePrompt: "Would you like to save this as a Journal entry?",
};

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

      const { error } = await supabase.from("garvis_user_modules").upsert(
        {
          user_id: userId,
          module_key: moduleKey,
          status: "activated",
          activated_by: "human",
          activated_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id,module_key" }
      );

      if (error) {
        toast.error("Failed to activate module");
        return;
      }

      await fetchModules();
    },
    [userId, fetchModules]
  );

  const suggestedModules = useMemo(() => modules.filter((m) => m.status === "suggested"), [modules]);
  const activeModules = useMemo(() => modules.filter((m) => m.status === "activated"), [modules]);

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
