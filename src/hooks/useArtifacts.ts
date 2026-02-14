import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Artifact {
  id: string;
  title: string;
  type: string;
  status: string;
  project_id: string | null;
  conversation_id: string | null;
  created_at: string;
  user_id: string;
}

export interface ArtifactVersion {
  id: string;
  artifact_id: string;
  version_number: number;
  content_md: string;
  actor: string;
  ai_decision_id: string | null;
  telauthorium_id: string;
  created_at: string;
}

export function useArtifacts(userId: string | undefined, conversationId: string | null) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [selected, setSelected] = useState<Artifact | null>(null);

  const fetchArtifacts = useCallback(async () => {
    if (!userId) return;
    let query = supabase
      .from("artifacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }

    const { data } = await query;
    setArtifacts((data as Artifact[]) || []);
  }, [userId, conversationId]);

  const fetchVersions = useCallback(async (artifactId: string) => {
    const { data } = await supabase
      .from("artifact_versions")
      .select("*")
      .eq("artifact_id", artifactId)
      .order("version_number", { ascending: false });
    setVersions((data as ArtifactVersion[]) || []);
  }, []);

  const createArtifact = async (title: string, type: string, seed: string) => {
    if (!userId) return;
    const { data } = await supabase
      .from("artifacts")
      .insert({
        user_id: userId,
        title,
        type,
        conversation_id: conversationId,
      })
      .select()
      .single();

    if (data) {
      await supabase.from("artifact_versions").insert({
        artifact_id: data.id,
        user_id: userId,
        content_md: seed,
        actor: "human",
      } as any);
      await fetchArtifacts();
    }
  };

  const saveNewVersion = async (artifactId: string, content: string) => {
    if (!userId) return;
    await supabase.from("artifact_versions").insert({
      artifact_id: artifactId,
      user_id: userId,
      content_md: content,
      actor: "human",
    } as any);
    await fetchVersions(artifactId);
  };

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  return {
    artifacts,
    versions,
    selected,
    setSelected,
    createArtifact,
    saveNewVersion,
    fetchVersions,
    fetchArtifacts,
  };
}
