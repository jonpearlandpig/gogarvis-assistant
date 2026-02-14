
-- Per-user domain completion tracking
CREATE TABLE public.akb_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain_key text NOT NULL,
  status text NOT NULL DEFAULT 'empty',
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain_key)
);

-- Validation trigger for status values
CREATE OR REPLACE FUNCTION public.akb_domains_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('empty', 'draft', 'complete') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be empty, draft, or complete.', NEW.status;
  END IF;
  IF NEW.status = 'complete' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER akb_domains_before_upsert
  BEFORE INSERT OR UPDATE ON public.akb_domains
  FOR EACH ROW EXECUTE FUNCTION public.akb_domains_validate();

-- Indexes
CREATE INDEX idx_akb_domains_user ON public.akb_domains(user_id);

-- RLS
ALTER TABLE public.akb_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "akb_domains_select_own" ON public.akb_domains
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "akb_domains_insert_own" ON public.akb_domains
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "akb_domains_update_own" ON public.akb_domains
  FOR UPDATE USING (auth.uid() = user_id);
