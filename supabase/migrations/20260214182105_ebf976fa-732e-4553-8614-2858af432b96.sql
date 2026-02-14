
-- Fix: recreate view with SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.v_receipts_report;
CREATE VIEW public.v_receipts_report
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.created_at,
  r.receipt_date,
  r.vendor,
  r.total_amount,
  r.tax_amount,
  r.currency,
  r.payment_last4,
  r.category,
  r.project_tag,
  r.reimbursable,
  r.telauthorium_id,
  r.source_path
FROM public.receipts r;
