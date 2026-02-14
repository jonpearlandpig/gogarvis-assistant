
-- Drop existing RLS policies on artifacts
DROP POLICY IF EXISTS "Users can create own artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Users can delete own artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Users can update own artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Users can view own artifacts" ON public.artifacts;

-- Alter artifacts table: add new columns, drop content
ALTER TABLE public.artifacts
  ADD COLUMN IF NOT EXISTS project_id text NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'DRAFT';

-- Drop FK on conversation_id, change to text
ALTER TABLE public.artifacts DROP CONSTRAINT IF EXISTS artifacts_conversation_id_fkey;
ALTER TABLE public.artifacts ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE public.artifacts ALTER COLUMN conversation_id TYPE text USING conversation_id::text;

-- Remove content column (moved to versions)
ALTER TABLE public.artifacts DROP COLUMN IF EXISTS content;

-- Revoke update/delete
REVOKE UPDATE, DELETE ON public.artifacts FROM anon, authenticated;

-- New policies
CREATE POLICY "artifacts_select_own"
ON public.artifacts FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "artifacts_insert_own"
ON public.artifacts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- -----------------------
-- ARTIFACT VERSIONS
-- -----------------------
CREATE TABLE IF NOT EXISTS public.artifact_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  version_number integer NOT NULL,
  content_md text NOT NULL,
  actor text NOT NULL DEFAULT 'human',
  ai_decision_id text NULL,
  telauthorium_id text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artifact_versions ENABLE ROW LEVEL SECURITY;
REVOKE UPDATE, DELETE ON public.artifact_versions FROM anon, authenticated;

CREATE POLICY "artifact_versions_select_own"
ON public.artifact_versions FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "artifact_versions_insert_own"
ON public.artifact_versions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- -----------------------
-- VERSION AUTO-INCREMENT + TID GENERATION
-- -----------------------
CREATE OR REPLACE FUNCTION public.artifact_versions_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  next_version integer;
BEGIN
  IF new.telauthorium_id IS NOT NULL THEN
    RAISE EXCEPTION 'Telauthorium ID is system-generated only.';
  END IF;

  SELECT coalesce(max(version_number),0) + 1
  INTO next_version
  FROM public.artifact_versions
  WHERE artifact_id = new.artifact_id;

  new.version_number := next_version;
  new.telauthorium_id := public.gen_telauthorium_id();

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_artifact_versions_before_insert ON public.artifact_versions;
CREATE TRIGGER trg_artifact_versions_before_insert
BEFORE INSERT ON public.artifact_versions
FOR EACH ROW EXECUTE FUNCTION public.artifact_versions_before_insert();

-- -----------------------
-- LEDGER LOGGING
-- -----------------------
CREATE OR REPLACE FUNCTION public.artifact_versions_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.telauthorium_ledger (
    user_id, telauthorium_id, action, actor, context
  ) VALUES (
    new.user_id,
    new.telauthorium_id,
    'ARTIFACT_VERSION_SAVED',
    new.actor,
    jsonb_build_object(
      'artifact_id', new.artifact_id,
      'version', new.version_number,
      'ai_decision_id', new.ai_decision_id
    )::text
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_artifact_versions_after_insert ON public.artifact_versions;
CREATE TRIGGER trg_artifact_versions_after_insert
AFTER INSERT ON public.artifact_versions
FOR EACH ROW EXECUTE FUNCTION public.artifact_versions_after_insert();
