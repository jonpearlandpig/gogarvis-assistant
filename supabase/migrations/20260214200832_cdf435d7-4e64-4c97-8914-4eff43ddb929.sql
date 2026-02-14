
-- 1) Module scaffold table
CREATE TABLE IF NOT EXISTS public.garvis_module_scaffolds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_key text NOT NULL,
  workspace_id uuid NULL,
  status text NOT NULL DEFAULT 'ready',
  next_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_module_scaffolds_user_module_ws
ON public.garvis_module_scaffolds (user_id, module_key, coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.garvis_module_scaffolds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_scaffolds_select_own"
ON public.garvis_module_scaffolds FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "module_scaffolds_insert_own"
ON public.garvis_module_scaffolds FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "module_scaffolds_update_own"
ON public.garvis_module_scaffolds FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2) Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_module_scaffolds
BEFORE UPDATE ON public.garvis_module_scaffolds
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Seed module definitions
INSERT INTO public.garvis_modules (module_key, display_name, description, activation_threshold)
VALUES
  ('akb_builder', 'AKB Builder', 'Collects, drafts, and publishes your AKB foundation.', 0.00),
  ('invoicewatch', 'InvoiceWatch', 'Tracks invoices: vendor, totals, due dates, status, recall.', 0.82)
ON CONFLICT (module_key) DO NOTHING;
