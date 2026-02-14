
-- 1) MODULE DEFINITIONS (system registry, readable by all authenticated users)
CREATE TABLE IF NOT EXISTS public.garvis_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text NOT NULL,
  activation_threshold numeric NOT NULL DEFAULT 0.85,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.garvis_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules_select_all"
ON public.garvis_modules
FOR SELECT
TO authenticated
USING (true);

-- Seed module definitions
INSERT INTO public.garvis_modules (module_key, display_name, description) VALUES
('receiptkeeper', 'ReceiptKeeper', 'Extract and track expense receipts'),
('invoicewatch', 'InvoiceWatch', 'Monitor and track invoices'),
('contractvault', 'ContractVault', 'Extract and store contract terms'),
('brandmemory', 'BrandMemory', 'Centralize brand voice and assets'),
('projectledger', 'ProjectLedger', 'Track milestones and deliverables'),
('clientcrm', 'ClientCRM', 'Lightweight relationship tracking'),
('contentforge', 'ContentForge', 'Content idea + post tracking'),
('legalradar', 'LegalRadar', 'Flag compliance signals'),
('dealtracker', 'DealTracker', 'Track opportunity pipeline'),
('meetingrecall', 'MeetingRecall', 'Store meeting notes'),
('metricsboard', 'MetricsBoard', 'Track performance metrics')
ON CONFLICT (module_key) DO NOTHING;

-- 2) USER MODULE ACTIVATION STATE
CREATE TABLE IF NOT EXISTS public.garvis_user_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_key text NOT NULL,
  status text NOT NULL DEFAULT 'inactive',
  confidence numeric DEFAULT 0,
  activation_score numeric DEFAULT 0,
  activated_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_key)
);

ALTER TABLE public.garvis_user_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_modules_select_own"
ON public.garvis_user_modules FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_modules_insert_own"
ON public.garvis_user_modules FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_modules_update_own"
ON public.garvis_user_modules FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3) MODULE DETECTION LOG (append-only, ledger-safe)
CREATE TABLE IF NOT EXISTS public.garvis_module_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_key text NOT NULL,
  source_type text NOT NULL,
  source_id uuid NULL,
  confidence numeric NOT NULL,
  signal_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.garvis_module_detections ENABLE ROW LEVEL SECURITY;

-- No update/delete on detections (append-only)
REVOKE UPDATE, DELETE ON public.garvis_module_detections FROM anon, authenticated;

CREATE POLICY "module_detections_select_own"
ON public.garvis_module_detections FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "module_detections_insert_own"
ON public.garvis_module_detections FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4) After activation, log to telauthorium_ledger
CREATE OR REPLACE FUNCTION public.garvis_user_modules_after_upsert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.status = 'activated' AND (OLD IS NULL OR OLD.status <> 'activated') THEN
    INSERT INTO public.telauthorium_ledger (user_id, telauthorium_id, action, actor, context)
    VALUES (
      NEW.user_id,
      public.gen_telauthorium_id(),
      'MODULE_ACTIVATED',
      'human',
      jsonb_build_object(
        'module', NEW.module_key,
        'activation_score', NEW.activation_score,
        'confidence', NEW.confidence
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_garvis_user_modules_after_upsert
AFTER INSERT OR UPDATE ON public.garvis_user_modules
FOR EACH ROW EXECUTE FUNCTION public.garvis_user_modules_after_upsert();
