import { supabase } from "@/integrations/supabase/client";

export type ReceiptCreate = {
  workspaceId?: string | null;
  receipt_date?: string | null;
  vendor?: string | null;
  total_amount?: number | null;
  tax_amount?: number | null;
  currency?: string | null;
  payment_last4?: string | null;
  category?: string | null;
  project_tag?: string | null;
  reimbursable?: boolean;
  source_path?: string | null;
  source_mime?: string | null;
  source_hash?: string | null;
  extracted_json?: any;
};

export async function uploadReceiptFile(params: {
  userId: string;
  file: File;
}) {
  const { userId, file } = params;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const objectPath = `${userId}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("akb_receipts")
    .upload(objectPath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (upErr) throw upErr;
  return { objectPath };
}

export async function createReceiptRow(params: {
  userId: string;
  payload: ReceiptCreate;
}) {
  const { userId, payload } = params;

  const { data, error } = await supabase
    .from("receipts" as any)
    .insert({
      user_id: userId,
      workspace_id: payload.workspaceId ?? null,
      receipt_date: payload.receipt_date ?? null,
      vendor: payload.vendor ?? null,
      total_amount: payload.total_amount ?? null,
      tax_amount: payload.tax_amount ?? null,
      currency: payload.currency ?? "USD",
      payment_last4: payload.payment_last4 ?? null,
      category: payload.category ?? null,
      project_tag: payload.project_tag ?? null,
      reimbursable: payload.reimbursable ?? false,
      source_path: payload.source_path ?? null,
      source_mime: payload.source_mime ?? null,
      source_hash: payload.source_hash ?? null,
      extracted_json: payload.extracted_json ?? {},
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function ingestReceiptV1(params: {
  userId: string;
  file: File;
  workspaceId?: string | null;
  fields?: Omit<ReceiptCreate, "source_path" | "source_mime" | "workspaceId">;
}) {
  const { userId, file, workspaceId, fields } = params;
  const { objectPath } = await uploadReceiptFile({ userId, file });

  const row = await createReceiptRow({
    userId,
    payload: {
      workspaceId: workspaceId ?? null,
      source_path: objectPath,
      source_mime: file.type || null,
      extracted_json: {},
      ...(fields || {}),
    },
  });

  return row;
}
