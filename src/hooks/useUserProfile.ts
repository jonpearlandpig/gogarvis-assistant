import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UOPConfig {
  phase_bias?: string;
  objective?: string;
  tone?: string;
  include_risk_review?: boolean;
  advanced_notes?: string;
  garvis_lens?: {
    systems: number;
    creative: number;
    architect: number;
    business: number;
    risk: number;
  };
}

export interface UOPVersion {
  id: string;
  user_profile_id: string;
  user_id: string;
  version_number: number;
  config_json: UOPConfig;
  telauthorium_id: string;
  created_at: string;
}

export function useUserProfile(userId: string | null) {
  const [version, setVersion] = useState<UOPVersion | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchLatest = useCallback(async () => {
    if (!userId) { setLoading(false); return; }

    // Get or create root profile
    let { data: profiles } = await (supabase
      .from("user_profiles")
      .select("id, name")
      .eq("user_id", userId)
      .limit(1) as any);

    let rootId = profiles?.[0]?.id;

    if (!rootId) {
      const { data: newProfile } = await supabase
        .from("user_profiles")
        .insert({ user_id: userId } as any)
        .select("id")
        .single();
      rootId = newProfile?.id;
    }

    setProfileId(rootId || null);
    setProfileName(profiles?.[0]?.name || "");

    if (rootId) {
      const { data: ver } = await supabase
        .from("user_profile_versions")
        .select("*")
        .eq("user_profile_id", rootId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      setVersion(ver as UOPVersion | null);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchLatest(); }, [fetchLatest]);

  const saveProfile = useCallback(async (config: UOPConfig) => {
    if (!userId || !profileId) return;

    const { error } = await supabase
      .from("user_profile_versions")
      .insert({
        user_profile_id: profileId,
        user_id: userId,
        config_json: config,
      } as any);

    if (error) {
      console.error(error);
      toast.error("Failed to save profile");
      return;
    }

    toast.success("Profile saved with Telauthorium ID");
    await fetchLatest();
  }, [userId, profileId, fetchLatest]);

  const renameProfile = useCallback(async (name: string) => {
    if (!profileId) return;
    const { error } = await (supabase
      .from("user_profiles")
      .update({ name })
      .eq("id", profileId) as any);
    if (error) {
      console.error("Rename error:", error);
      toast.error("Failed to rename profile");
      return;
    }
    setProfileName(name);
  }, [profileId]);

  return { version, loading, profileName, saveProfile, renameProfile };
}
