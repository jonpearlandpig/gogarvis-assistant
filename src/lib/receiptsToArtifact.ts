import { buildReceiptsCSV, type ReceiptFilters } from "@/lib/receiptsReport";

export async function buildReceiptReportArtifactSeed(filters: ReceiptFilters) {
  const { csv, rowsCount } = await buildReceiptsCSV(filters);

  const titleBits = [
    "Receipts Report",
    filters.from ? `from ${filters.from}` : null,
    filters.to ? `to ${filters.to}` : null,
    filters.reimbursable === true ? "reimbursable" : null,
    filters.project_tag ? `project ${filters.project_tag}` : null,
  ].filter(Boolean);

  const title = titleBits.join(" • ");
  return { title, seed: csv, rowsCount };
}
