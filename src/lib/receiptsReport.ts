import { supabase } from "@/integrations/supabase/client";

export type ReceiptFilters = {
  from?: string;
  to?: string;
  vendor?: string;
  category?: string;
  project_tag?: string;
  reimbursable?: boolean;
};

function csvEscape(v: any) {
  const s = v === null || v === undefined ? "" : String(v);
  const needs = /[,"\n]/.test(s);
  return needs ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: Record<string, any>[], columns: string[]) {
  const header = columns.map(csvEscape).join(",");
  const lines = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(","));
  return [header, ...lines].join("\n");
}

export async function fetchReceiptsForReport(filters: ReceiptFilters) {
  let q = supabase
    .from("v_receipts_report" as any)
    .select("*")
    .order("receipt_date", { ascending: false });

  if (filters.from) q = q.gte("receipt_date", filters.from);
  if (filters.to) q = q.lte("receipt_date", filters.to);
  if (filters.vendor) q = q.ilike("vendor", `%${filters.vendor}%`);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.project_tag) q = q.eq("project_tag", filters.project_tag);
  if (typeof filters.reimbursable === "boolean") q = q.eq("reimbursable", filters.reimbursable);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as any[];
}

export function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function buildReceiptsCSV(filters: ReceiptFilters) {
  const rows = await fetchReceiptsForReport(filters);

  const columns = [
    "receipt_date",
    "vendor",
    "total_amount",
    "tax_amount",
    "currency",
    "category",
    "project_tag",
    "reimbursable",
    "payment_last4",
    "telauthorium_id",
    "source_path",
  ];

  const csv = toCSV(rows, columns);
  return { csv, rowsCount: rows.length };
}
