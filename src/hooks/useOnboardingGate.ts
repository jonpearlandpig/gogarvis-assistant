import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EntryLevel = "unset" | "getting_started" | "already_building";

export function useOnboardingGate(userId: string | null) {
  const [entryLevel, setEntryLevel] = useState<EntryLevel>("unset");
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setEntryLevel("unset");
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("garvis_user_onboarding" as any)
      .select("entry_level")
      .eq("user_id", userId)
      .maybeSingle();

    const row = data as { entry_level?: string } | null;
    if (!error && row?.entry_level) {
      setEntryLevel(row.entry_level as EntryLevel);
    } else {
      await supabase.from("garvis_user_onboarding" as any).upsert(
        { user_id: userId, entry_level: "unset" },
        { onConflict: "user_id" } as any
      );
      setEntryLevel("unset");
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const choose = useCallback(
    async (level: "getting_started" | "already_building") => {
      if (!userId) return;
      await supabase.from("garvis_user_onboarding" as any).upsert(
        {
          user_id: userId,
          entry_level: level,
          chosen_at: new Date().toISOString(),
        },
        { onConflict: "user_id" } as any
      );
      setEntryLevel(level);
    },
    [userId]
  );

  return { loading, entryLevel, choose, refetch };
}
