import { supabase } from "@/integrations/supabase/client";

export async function ensureModuleScaffold(params: {
  userId: string;
  moduleKey: string;
  workspaceId?: string | null;
  nextSteps?: string[];
  context?: Record<string, any>;
}) {
  const { userId, moduleKey, workspaceId, nextSteps, context } = params;
  const payload = {
    user_id: userId,
    module_key: moduleKey,
    workspace_id: workspaceId || null,
    status: "ready",
    next_steps: nextSteps || [],
    context: context || {},
  };

  await supabase
    .from("garvis_module_scaffolds" as any)
    .upsert(payload, { onConflict: "user_id,module_key,workspace_id" } as any);
}

export async function activateAKBBuilderFlow(userId: string, workspaceId?: string | null) {
  await supabase.from("garvis_user_modules").upsert(
    {
      user_id: userId,
      module_key: "akb_builder",
      status: "activated",
      activated_by: "human",
      activated_at: new Date().toISOString(),
    } as any,
    { onConflict: "user_id,module_key" }
  );

  await ensureModuleScaffold({
    userId,
    moduleKey: "akb_builder",
    workspaceId,
    nextSteps: [
      "Upload your existing docs or paste quick notes into drafts.",
      "Approve drafts to publish LAW.",
      "Reach 80% coverage to unlock the full workspace.",
    ],
    context: { mode: "foundation_accelerator" },
  });
}
