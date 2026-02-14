import { supabase } from "@/integrations/supabase/client";

export async function uploadAKBFile(params: {
  userId: string;
  workspaceId: string | null;
  file: File;
}) {
  const { userId, workspaceId, file } = params;

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${userId}/${workspaceId || "system"}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage.from("akb").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("akb_uploads")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      kind: "file",
      filename: file.name,
      mime_type: file.type || null,
      storage_path: path,
      size_bytes: file.size,
      source_label: "Upload",
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}
