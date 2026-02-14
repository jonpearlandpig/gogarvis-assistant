export function buildInvoiceSignals(input: {
  text?: string;
  invoice_layout_score?: number;
}) {
  const t = (input.text || "").toLowerCase();
  return {
    has_invoice_number: /\binvoice\s*(#|no\.?)\s*\w+/.test(t),
    has_due_date: /\bdue\s*date\b/.test(t),
    invoice_layout_score: input.invoice_layout_score ?? 0,
  };
}
