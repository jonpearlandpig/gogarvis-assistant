
-- Storage bucket for receipt files
INSERT INTO storage.buckets (id, name, public)
VALUES ('akb_receipts', 'akb_receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "receipts_bucket_read_own" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'akb_receipts' AND (auth.uid()::text = split_part(name,'/',1)));

CREATE POLICY "receipts_bucket_write_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'akb_receipts' AND (auth.uid()::text = split_part(name,'/',1)));

-- 1) RECEIPTS TABLE (append-only)
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NULL,
  receipt_date date NULL,
  vendor text NULL,
  total_amount numeric(12,2) NULL,
  tax_amount numeric(12,2) NULL,
  currency text NOT NULL DEFAULT 'USD',
  payment_last4 text NULL,
  category text NULL,
  project_tag text NULL,
  reimbursable boolean NOT NULL DEFAULT false,
  source_path text NULL,
  source_mime text NULL,
  source_hash text NULL,
  extracted_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  telauthorium_id text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- HARDEN: no update/delete
REVOKE UPDATE, DELETE ON public.receipts FROM anon, authenticated;

CREATE POLICY "receipts_select_own"
ON public.receipts FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "receipts_insert_own"
ON public.receipts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 2) BEFORE INSERT trigger
CREATE OR REPLACE FUNCTION public.receipts_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF new.telauthorium_id IS NOT NULL THEN
    RAISE EXCEPTION 'telauthorium_id is system-generated only';
  END IF;

  IF new.currency IS NULL OR length(trim(new.currency)) = 0 THEN
    new.currency := 'USD';
  END IF;

  IF new.total_amount IS NOT NULL AND new.total_amount < 0 THEN
    RAISE EXCEPTION 'total_amount must be >= 0';
  END IF;

  new.telauthorium_id := public.gen_telauthorium_id();
  RETURN new;
END;
$$;

CREATE TRIGGER trg_receipts_before_insert
BEFORE INSERT ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.receipts_before_insert();

-- 3) AFTER INSERT (ledger logging)
CREATE OR REPLACE FUNCTION public.receipts_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.telauthorium_ledger (user_id, telauthorium_id, action, actor, context)
  VALUES (
    new.user_id,
    new.telauthorium_id,
    'RECEIPT_INGESTED',
    'human',
    jsonb_build_object(
      'receipt_id', new.id,
      'workspace_id', new.workspace_id,
      'receipt_date', new.receipt_date,
      'vendor', new.vendor,
      'total_amount', new.total_amount,
      'currency', new.currency,
      'category', new.category,
      'project_tag', new.project_tag,
      'reimbursable', new.reimbursable,
      'source_path', new.source_path,
      'source_mime', new.source_mime
    )
  );
  RETURN new;
END;
$$;

CREATE TRIGGER trg_receipts_after_insert
AFTER INSERT ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.receipts_after_insert();

-- 4) REPORT VIEW
CREATE OR REPLACE VIEW public.v_receipts_report AS
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
