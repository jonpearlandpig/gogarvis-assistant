
-- 1) Add edit/apply columns to ingest_proposals
ALTER TABLE public.ingest_proposals
  ADD COLUMN IF NOT EXISTS edited_payload_json jsonb,
  ADD COLUMN IF NOT EXISTS edited_summary text,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS editor_user_id uuid,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz;

-- 2) RPC: update proposal edits
CREATE OR REPLACE FUNCTION public.ingest_update_proposal(
  p_proposal_id uuid,
  p_edited_summary text,
  p_edited_payload jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.ingest_proposals
     SET edited_summary = p_edited_summary,
         edited_payload_json = p_edited_payload,
         edited_at = now(),
         editor_user_id = auth.uid(),
         status = 'edited'
   WHERE id = p_proposal_id
     AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_update_proposal(uuid, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.ingest_update_proposal(uuid, text, jsonb) TO authenticated;

-- 3) RPC: batch approve/deny
CREATE OR REPLACE FUNCTION public.ingest_batch_set_status(
  p_ingest_id uuid,
  p_ids uuid[],
  p_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_status NOT IN ('approved','denied') THEN
    RAISE EXCEPTION 'Invalid status %', p_status;
  END IF;

  UPDATE public.ingest_proposals
     SET status = p_status,
         updated_at = now()
   WHERE ingest_id = p_ingest_id
     AND user_id = auth.uid()
     AND id = ANY(p_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_batch_set_status(uuid, uuid[], text) FROM public;
GRANT EXECUTE ON FUNCTION public.ingest_batch_set_status(uuid, uuid[], text) TO authenticated;

-- 4) RPC: apply a single proposal
CREATE OR REPLACE FUNCTION public.ingest_apply_proposal(
  p_proposal_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v public.ingest_proposals%rowtype;
  payload jsonb;
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

  payload := coalesce(v.edited_payload_json, v.payload_json);

  IF v.proposal_type = 'akb_draft' THEN
    INSERT INTO public.akb_drafts (user_id, domain, title, body_md, sources, proposed_by, status)
    VALUES (
      auth.uid(),
      coalesce(payload->>'domain', v.target),
      coalesce(payload->>'title', v.summary),
      coalesce(payload->>'body_md', (SELECT string_agg('- ' || b, E'\n') FROM jsonb_array_elements_text(coalesce(payload->'bullets','[]'::jsonb)) b), ''),
      coalesce(payload->'sources', '[]'::jsonb),
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
$$;

REVOKE ALL ON FUNCTION public.ingest_apply_proposal(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.ingest_apply_proposal(uuid) TO authenticated;
