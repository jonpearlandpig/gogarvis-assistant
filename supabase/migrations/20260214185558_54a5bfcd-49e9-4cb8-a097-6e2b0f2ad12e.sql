
-- 1) Add activated_by column
ALTER TABLE public.garvis_user_modules
ADD COLUMN IF NOT EXISTS activated_by text NOT NULL DEFAULT 'system';

-- 2) Fix ledger trigger: context as jsonb, actor from activated_by
CREATE OR REPLACE FUNCTION public.garvis_user_modules_after_upsert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  tid text;
  actor_text text;
BEGIN
  IF (NEW.status = 'activated') AND (TG_OP = 'INSERT' OR (OLD.status IS DISTINCT FROM 'activated')) THEN
    tid := public.gen_telauthorium_id();
    actor_text := CASE WHEN NEW.activated_by = 'human' THEN 'human' ELSE 'system' END;

    INSERT INTO public.telauthorium_ledger (user_id, telauthorium_id, action, actor, context)
    VALUES (
      NEW.user_id,
      tid,
      'MODULE_ACTIVATED',
      actor_text,
      jsonb_build_object(
        'module', NEW.module_key,
        'activation_score', NEW.activation_score,
        'confidence', NEW.confidence,
        'activated_by', NEW.activated_by
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_garvis_user_modules_after_upsert ON public.garvis_user_modules;
CREATE TRIGGER trg_garvis_user_modules_after_upsert
AFTER INSERT OR UPDATE ON public.garvis_user_modules
FOR EACH ROW EXECUTE FUNCTION public.garvis_user_modules_after_upsert();

-- 3) Seed Journal module
INSERT INTO public.garvis_modules (module_key, display_name, description, activation_threshold)
VALUES (
  'journal',
  'Journal',
  'Captures reflective entries with consent. Structured, searchable, and user-owned.',
  0.82
)
ON CONFLICT (module_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    activation_threshold = EXCLUDED.activation_threshold;
