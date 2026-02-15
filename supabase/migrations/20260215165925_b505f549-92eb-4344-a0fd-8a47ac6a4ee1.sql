
CREATE OR REPLACE FUNCTION public.ingest_apply_proposal(p_proposal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v public.ingest_proposals%rowtype;
  r_workspace_id uuid;
  r_source_file_ids jsonb;
  payload jsonb;
  built_sources jsonb;
  out jsonb := '{}'::jsonb;
  new_project_id uuid;
BEGIN
  SELECT * INTO v
    FROM public.ingest_proposals
   WHERE id = p_proposal_id
     AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  IF v.status NOT IN ('approved','edited') THEN
    RAISE EXCEPTION 'Proposal must be approved or edited before apply (status=%)', v.status;
  END IF;

  -- Fetch workspace_id and source_file_ids from the parent ingest_run
  SELECT workspace_id, source_file_ids
    INTO r_workspace_id, r_source_file_ids
    FROM public.ingest_runs
   WHERE id = v.ingest_id
     AND user_id = auth.uid();

  payload := coalesce(v.edited_payload_json, v.payload_json);

  -- Build sources: prefer payload sources if non-empty, otherwise derive from ingest_run source_file_ids
  IF payload->'sources' IS NOT NULL AND jsonb_typeof(payload->'sources') = 'array' AND jsonb_array_length(payload->'sources') > 0 THEN
    built_sources := payload->'sources';
  ELSIF r_source_file_ids IS NOT NULL AND jsonb_typeof(r_source_file_ids) = 'array' AND jsonb_array_length(r_source_file_ids) > 0 THEN
    SELECT jsonb_agg(jsonb_build_object('upload_id', elem, 'note', 'From ingest run'))
      INTO built_sources
      FROM jsonb_array_elements_text(r_source_file_ids) AS elem;
  ELSE
    built_sources := '[]'::jsonb;
  END IF;

  IF v.proposal_type = 'akb_draft' THEN
    INSERT INTO public.akb_drafts (user_id, workspace_id, domain, title, body_md, sources, proposed_by, status)
    VALUES (
      auth.uid(),
      r_workspace_id,
      coalesce(payload->>'domain', v.target),
      coalesce(payload->>'title', v.summary),
      coalesce(payload->>'body_md', (SELECT string_agg('- ' || b, E'\n') FROM jsonb_array_elements_text(coalesce(payload->'bullets','[]'::jsonb)) b), ''),
      built_sources,
      'garvis_ingest',
      'draft'
    );
    out := jsonb_build_object('applied', true, 'type', 'akb_draft');

  ELSIF v.proposal_type = 'project_scaffold' THEN
    INSERT INTO public.akb_projects (user_id, name)
    VALUES (auth.uid(), coalesce(payload->>'project_name', v.target, 'New Project'))
    RETURNING id INTO new_project_id;

    INSERT INTO public.akb_project_context (user_id, project_id, domain_key, field_key, value, status)
    SELECT
      auth.uid(),
      new_project_id,
      coalesce(f->>'domain_key','ops'),
      coalesce(f->>'field_key','note'),
      coalesce(f->>'value',''),
      coalesce(f->>'status','draft')
    FROM jsonb_array_elements(coalesce(payload->'fields','[]'::jsonb)) f;

    out := jsonb_build_object('applied', true, 'type', 'project_scaffold', 'project_id', new_project_id);

  ELSIF v.proposal_type = 'artifact_seed' THEN
    INSERT INTO public.artifacts (user_id, title, type, status)
    VALUES (
      auth.uid(),
      coalesce(payload->>'title', v.summary),
      coalesce(payload->>'type', 'text'),
      'DRAFT'
    );
    out := jsonb_build_object('applied', true, 'type', 'artifact_seed');

  ELSIF v.proposal_type = 'template_clone' THEN
    INSERT INTO public.akb_projects (user_id, name)
    VALUES (auth.uid(), coalesce(payload->>'project_name', 'Project 01'))
    RETURNING id INTO new_project_id;

    INSERT INTO public.akb_project_context (user_id, project_id, domain_key, field_key, value, status)
    SELECT
      auth.uid(),
      new_project_id,
      coalesce(f->>'domain_key','ops'),
      coalesce(f->>'field_key','note'),
      coalesce(f->>'value',''),
      coalesce(f->>'status','draft')
    FROM jsonb_array_elements(coalesce(payload->'fields','[]'::jsonb)) f;

    out := jsonb_build_object('applied', true, 'type', 'template_clone', 'project_id', new_project_id);
  ELSE
    RAISE EXCEPTION 'Unknown proposal_type %', v.proposal_type;
  END IF;

  UPDATE public.ingest_proposals
     SET status = 'applied',
         applied_at = now()
   WHERE id = p_proposal_id
     AND user_id = auth.uid();

  RETURN out;
END;
$function$;
