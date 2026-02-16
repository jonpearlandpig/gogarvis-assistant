import { supabase } from "@/integrations/supabase/client";

export interface CanonicalData {
  id?: string;
  tone_profile?: string | null;
  communication_style?: string | null;
  pricing_posture?: string | null;
  risk_profile?: string | null;
  decision_philosophy?: string | null;
  deal_breakers?: string[] | null;
  strategic_intent?: string | null;
}

export interface ProjectContextField {
  id: string;
  project_id: string;
  domain_key: string;
  field_key: string;
  value: string | null;
  status: string;
}

export interface ScopedAKB {
  mode: "canonical" | "project";
  canonical: CanonicalData | null;
  project: Record<string, string> | null;
  merged: Record<string, any>;
}

export async function fetchCanonical(userId: string): Promise<CanonicalData | null> {
  const { data } = await supabase
    .from("akb_user_canonical" as any)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data as CanonicalData | null;
}

export async function upsertCanonical(userId: string, fields: Partial<CanonicalData>) {
  const { error } = await supabase
    .from("akb_user_canonical" as any)
    .upsert({ user_id: userId, ...fields } as any, { onConflict: "user_id" });
  if (error) throw error;
}

export async function fetchProjects(userId: string) {
  const { data } = await supabase
    .from("akb_projects" as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []) as unknown as Array<{ id: string; name: string; status: string; created_at: string }>;
}

export async function createProject(userId: string, name: string) {
  const { data, error } = await supabase
    .from("akb_projects" as any)
    .insert({ user_id: userId, name } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as { id: string; name: string };
}

export async function fetchProjectContext(projectId: string): Promise<ProjectContextField[]> {
  const { data } = await supabase
    .from("akb_project_context" as any)
    .select("*")
    .eq("project_id", projectId);
  return (data || []) as unknown as ProjectContextField[];
}

export async function upsertProjectContextField(
  userId: string,
  projectId: string,
  domainKey: string,
  fieldKey: string,
  value: string,
  status = "draft"
) {
  const { error } = await supabase
    .from("akb_project_context" as any)
    .upsert(
      { user_id: userId, project_id: projectId, domain_key: domainKey, field_key: fieldKey, value, status } as any,
      { onConflict: "id" }
    );
  if (error) throw error;
}

export async function renameProject(projectId: string, name: string) {
  const { error } = await supabase
    .from("akb_projects" as any)
    .update({ name } as any)
    .eq("id", projectId);
  if (error) throw error;
}

export async function deleteProject(projectId: string) {
  // Delete project context first
  await supabase.from("akb_project_context" as any).delete().eq("project_id", projectId);
  const { error } = await supabase.from("akb_projects" as any).delete().eq("id", projectId);
  if (error) throw error;
}

export function buildScopedAKB(
  canonical: CanonicalData | null,
  projectFields: ProjectContextField[] | null,
  projectId: string | null
): ScopedAKB {
  if (!projectId || !projectFields) {
    return { mode: "canonical", canonical, project: null, merged: canonical || {} };
  }

  const projectOverlay = (projectFields || []).reduce((acc: Record<string, string>, row) => {
    if (row.value) acc[row.field_key] = row.value;
    return acc;
  }, {});

  return {
    mode: "project",
    canonical,
    project: projectOverlay,
    merged: { ...(canonical || {}), ...projectOverlay },
  };
}
