import { supabase } from "@/integrations/supabase/client";

export async function ingestUrlToAKB(params: {
  url: string;
  workspace_id?: string | null;
  create_draft?: boolean;
}) {
  const { data, error } = await supabase.functions.invoke("akb-url-ingest", {
    body: params,
  });
  if (error) throw new Error(error.message || "URL ingest failed");
  if (data?.error) throw new Error(data.error);
  return data as { ok: boolean; source_id: string; url: string; title: string | null; word_count: number };
}
