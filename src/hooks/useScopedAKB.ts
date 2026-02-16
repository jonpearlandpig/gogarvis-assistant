import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchCanonical,
  upsertCanonical,
  fetchProjects,
  createProject,
  renameProject as renameProjectApi,
  deleteProject as deleteProjectApi,
  fetchProjectContext,
  upsertProjectContextField,
  buildScopedAKB,
  type CanonicalData,
  type ProjectContextField,
  type ScopedAKB,
} from "@/lib/scoped-akb";
import { toast } from "sonner";

export function useScopedAKB(userId: string | null) {
  const [canonical, setCanonical] = useState<CanonicalData | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; status: string; created_at: string }>>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectFields, setProjectFields] = useState<ProjectContextField[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [c, p] = await Promise.all([fetchCanonical(userId), fetchProjects(userId)]);
      setCanonical(c);
      setProjects(p);
    } catch (e) {
      console.error("useScopedAKB fetch error:", e);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Load project context when active project changes
  useEffect(() => {
    if (!activeProjectId) { setProjectFields([]); return; }
    fetchProjectContext(activeProjectId).then(setProjectFields).catch(console.error);
  }, [activeProjectId]);

  const scoped: ScopedAKB = buildScopedAKB(canonical, projectFields, activeProjectId);

  const saveCanonical = useCallback(async (fields: Partial<CanonicalData>) => {
    if (!userId) return;
    try {
      await upsertCanonical(userId, fields);
      toast.success("Canonical AKB saved");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save canonical");
    }
  }, [userId, refresh]);

  const addProject = useCallback(async (name: string) => {
    if (!userId) return;
    try {
      const p = await createProject(userId, name);
      toast.success(`Project "${p.name}" created`);
      await refresh();
      setActiveProjectId(p.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create project");
    }
  }, [userId, refresh]);

  const renameProject = useCallback(async (projectId: string, name: string) => {
    try {
      await renameProjectApi(projectId, name);
      setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, name } : p));
    } catch (e: any) {
      toast.error(e?.message || "Failed to rename project");
    }
  }, []);

  const removeProject = useCallback(async (projectId: string) => {
    try {
      await deleteProjectApi(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (activeProjectId === projectId) setActiveProjectId(null);
      toast.success("Project deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete project");
    }
  }, [activeProjectId]);

  const saveProjectField = useCallback(async (domainKey: string, fieldKey: string, value: string) => {
    if (!userId || !activeProjectId) return;
    try {
      await upsertProjectContextField(userId, activeProjectId, domainKey, fieldKey, value);
      const updated = await fetchProjectContext(activeProjectId);
      setProjectFields(updated);
      toast.success("Project context saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save project context");
    }
  }, [userId, activeProjectId]);

  const hasScaffoldedRef = useRef(false);

  const scaffoldOnUnlock = useCallback(async (): Promise<{ createdProjectId: string | null }> => {
    if (!userId) return { createdProjectId: null };
    if (hasScaffoldedRef.current) return { createdProjectId: null };

    const existing = await fetchProjects(userId);
    if (existing.length > 0) {
      hasScaffoldedRef.current = true;
      return { createdProjectId: null };
    }

    const p = await createProject(userId, "Project 01");

    await Promise.all([
      upsertProjectContextField(userId, p.id, "offer", "offer_summary", "TBD", "draft"),
      upsertProjectContextField(userId, p.id, "goals", "primary_goal", "TBD", "draft"),
    ]);

    hasScaffoldedRef.current = true;
    return { createdProjectId: p.id };
  }, [userId]);

  return {
    canonical,
    projects,
    activeProjectId,
    setActiveProjectId,
    projectFields,
    scoped,
    loading,
    saveCanonical,
    addProject,
    renameProject,
    removeProject,
    saveProjectField,
    refresh,
    scaffoldOnUnlock,
  };
}
