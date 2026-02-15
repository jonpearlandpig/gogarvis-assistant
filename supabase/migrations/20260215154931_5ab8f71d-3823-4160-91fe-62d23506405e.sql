
-- RPC: persist a single identity choice into akb_project_context (reuses existing table)
CREATE OR REPLACE FUNCTION public.akb_set_identity_choice(p_key text, p_value text)
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

  -- Find or create a project
  SELECT id INTO active_project_id
  FROM public.akb_projects
  WHERE user_id = u
  ORDER BY created_at DESC
  LIMIT 1;

  IF active_project_id IS NULL THEN
    INSERT INTO public.akb_projects (user_id, name)
    VALUES (u, 'My Business')
    RETURNING id INTO active_project_id;
  END IF;

  INSERT INTO public.akb_project_context (user_id, project_id, domain_key, field_key, value, status)
  VALUES (u, active_project_id, 'identity', p_key, p_value, 'draft')
  ON CONFLICT (user_id, project_id, domain_key, field_key)
  DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'project_id', active_project_id);
END;
$$;

-- RPC: quickstart identity drafts
CREATE OR REPLACE FUNCTION public.akb_quickstart_identity(p_source text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  u uuid := auth.uid();
  v_purpose text;
  v_mission text;
  v_tone text;
  active_project_id uuid;
  ws_id uuid;
BEGIN
  IF u IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the active project
  SELECT id INTO active_project_id
  FROM public.akb_projects
  WHERE user_id = u
  ORDER BY created_at DESC
  LIMIT 1;

  IF active_project_id IS NULL THEN
    RAISE EXCEPTION 'No project found. Complete identity choices first.';
  END IF;

  -- Read the choices
  SELECT value INTO v_purpose FROM public.akb_project_context
  WHERE user_id = u AND project_id = active_project_id AND domain_key = 'identity' AND field_key = 'purpose';

  SELECT value INTO v_mission FROM public.akb_project_context
  WHERE user_id = u AND project_id = active_project_id AND domain_key = 'identity' AND field_key = 'mission';

  SELECT value INTO v_tone FROM public.akb_project_context
  WHERE user_id = u AND project_id = active_project_id AND domain_key = 'identity' AND field_key = 'tone';

  -- Determine workspace_id from most recent ingest_run or null
  SELECT workspace_id INTO ws_id
  FROM public.ingest_runs
  WHERE user_id = u AND workspace_id IS NOT NULL
  ORDER BY created_at DESC LIMIT 1;

  -- Create identity drafts
  INSERT INTO public.akb_drafts (user_id, workspace_id, domain, title, body_md, sources, proposed_by, status)
  VALUES
    (
      u, ws_id, 'identity', 'AKB Purpose & Type',
      format(E'- AKB Type: %s\n- This system is configured for a %s use case.', coalesce(v_purpose, 'Not set'), lower(coalesce(v_purpose, 'general'))),
      jsonb_build_array(jsonb_build_object('note', coalesce(p_source, 'identity_builder'))),
      'garvis_quickstart', 'draft'
    ),
    (
      u, ws_id, 'identity', 'Core Mission',
      format(E'- Primary mission: %s\n- All decisions and priorities align to this directive.', coalesce(v_mission, 'Not set')),
      jsonb_build_array(jsonb_build_object('note', coalesce(p_source, 'identity_builder'))),
      'garvis_quickstart', 'draft'
    ),
    (
      u, ws_id, 'identity', 'Communication Tone',
      format(E'- GARVIS tone preset: %s\n- All generated content, responses, and artifacts should reflect this voice.', coalesce(v_tone, 'Not set')),
      jsonb_build_array(jsonb_build_object('note', coalesce(p_source, 'identity_builder'))),
      'garvis_quickstart', 'draft'
    );

  RETURN jsonb_build_object('ok', true, 'created', 3, 'domain', 'identity');
END;
$$;
