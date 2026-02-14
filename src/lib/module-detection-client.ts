import { supabase } from "@/integrations/supabase/client";

export type ModuleDetectionResponse = {
  detections: { module_key: string; confidence: number }[];
  activations: { module_key: string; status: "suggested" | "activated"; activation_score: number }[];
};

export async function runModuleDetection(params: {
  source_type: "upload" | "chat" | "note" | "artifact";
  source_id?: string | null;
  signals: Record<string, any>;
}): Promise<ModuleDetectionResponse> {
  const { data, error } = await supabase.functions.invoke<ModuleDetectionResponse>(
    "module-detection",
    { body: params }
  );

  if (error) throw new Error(error.message || "Module detection failed");
  if (!data) return { detections: [], activations: [] };
  return data;
}
