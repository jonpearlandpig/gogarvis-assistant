
-- 1) Guard: canonical updates only allowed when app.akb_scope = 'canonical'
CREATE OR REPLACE FUNCTION public.guard_canonical_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  scope text := current_setting('app.akb_scope', true);
BEGIN
  IF scope IS DISTINCT FROM 'canonical' THEN
    RAISE EXCEPTION 'Canonical layer cannot be modified outside canonical scope';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_canonical_updates ON public.akb_user_canonical;

CREATE TRIGGER trg_guard_canonical_updates
BEFORE UPDATE ON public.akb_user_canonical
FOR EACH ROW
EXECUTE FUNCTION public.guard_canonical_updates();

-- 2) Guard: project context rows must belong to project owner
CREATE OR REPLACE FUNCTION public.enforce_project_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.akb_projects WHERE id = NEW.project_id;
  IF owner_id IS NULL OR owner_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Project owner mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_project_owner ON public.akb_project_context;

CREATE TRIGGER trg_enforce_project_owner
BEFORE INSERT OR UPDATE ON public.akb_project_context
FOR EACH ROW
EXECUTE FUNCTION public.enforce_project_owner();
