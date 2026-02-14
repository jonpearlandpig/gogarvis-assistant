/**
 * Build receipt detection signals for the module-detection edge function.
 */
export function buildReceiptSignals(params: {
  receipt_layout_score: number;
  has_total?: boolean;
  has_vendor?: boolean;
  currency_symbol?: boolean;
}) {
  return {
    has_total: params.has_total ?? true,
    has_vendor: params.has_vendor ?? true,
    currency_symbol: params.currency_symbol ?? true,
    receipt_layout_score: params.receipt_layout_score,
  };
}
