
-- Add unique constraint needed for ON CONFLICT
ALTER TABLE public.akb_domains
  ADD CONSTRAINT akb_domains_user_domain_uq UNIQUE (user_id, domain_key);

-- Auto-sync on draft approval
CREATE OR REPLACE FUNCTION public.akb_on_draft_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.status = 'approved') THEN
    INSERT INTO public.akb_domains (user_id, domain_key, status, min_met, progress_json)
    VALUES (NEW.user_id, NEW.domain, 'draft', true, jsonb_build_object('need',1,'have',1))
    ON CONFLICT (user_id, domain_key)
    DO UPDATE SET
      status = CASE
        WHEN public.akb_domains.locked = true THEN public.akb_domains.status
        WHEN public.akb_domains.status = 'empty' THEN 'draft'
        ELSE public.akb_domains.status
      END,
      min_met = true,
      progress_json = jsonb_build_object('need',1,'have',1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_akb_draft_status_change ON public.akb_drafts;
CREATE TRIGGER trg_akb_draft_status_change
AFTER INSERT OR UPDATE OF status ON public.akb_drafts
FOR EACH ROW
EXECUTE FUNCTION public.akb_on_draft_status_change();

-- Auto-sync on law publish
CREATE OR REPLACE FUNCTION public.akb_on_law_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.akb_domains (user_id, domain_key, status, min_met, progress_json)
  VALUES (NEW.user_id, NEW.domain, 'complete', true, jsonb_build_object('need',1,'have',1))
  ON CONFLICT (user_id, domain_key)
  DO UPDATE SET
    status = CASE
      WHEN public.akb_domains.locked = true THEN public.akb_domains.status
      ELSE 'complete'
    END,
    min_met = true,
    progress_json = jsonb_build_object('need',1,'have',1);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_akb_law_insert ON public.akb_law;
CREATE TRIGGER trg_akb_law_insert
AFTER INSERT ON public.akb_law
FOR EACH ROW
EXECUTE FUNCTION public.akb_on_law_insert();
