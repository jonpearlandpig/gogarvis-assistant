
-- Add unique constraint for upsert in akb_set_offer_choice
ALTER TABLE public.akb_project_context
  ADD CONSTRAINT akb_project_context_unique_field
  UNIQUE (user_id, project_id, domain_key, field_key);

-- Replace akb_set_offer_choice with project_context + domains fallback
CREATE OR REPLACE FUNCTION public.akb_set_offer_choice(p_key text, p_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  u uuid := auth.uid();
  active_project_id uuid;
BEGIN
  IF u IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Try to find an active project (newest)
  SELECT id INTO active_project_id
  FROM public.akb_projects
  WHERE user_id = u
  ORDER BY created_at DESC
  LIMIT 1;

  IF active_project_id IS NOT NULL THEN
    INSERT INTO public.akb_project_context (user_id, project_id, domain_key, field_key, value, status)
    VALUES (u, active_project_id, 'offer', p_key, p_value, 'draft')
    ON CONFLICT (user_id, project_id, domain_key, field_key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = now();

    RETURN jsonb_build_object('ok', true, 'where', 'project_context', 'project_id', active_project_id);
  END IF;

  -- Fallback: store in akb_domains.progress_json
  UPDATE public.akb_domains
     SET progress_json = coalesce(progress_json, '{}'::jsonb) || jsonb_build_object(p_key, p_value),
         updated_at = now()
   WHERE user_id = u
     AND domain_key = 'offer';

  RETURN jsonb_build_object('ok', true, 'where', 'akb_domains');
END;
$$;

REVOKE ALL ON FUNCTION public.akb_set_offer_choice(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.akb_set_offer_choice(text, text) TO authenticated;
