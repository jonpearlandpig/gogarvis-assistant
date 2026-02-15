
-- Quickstart Offer RPC: creates 2 offer drafts automatically
CREATE OR REPLACE FUNCTION public.akb_quickstart_offer(p_source text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.akb_drafts (user_id, domain, title, body_md, sources, proposed_by, status)
  VALUES
    (
      u, 'offer', 'Pearl & Pig Core Services',
      E'- High-end creative storytelling, brand development, and multi-media production.\n- Bridge raw vision to polished, market-ready execution.\n- Deal breaker: never sacrifice aesthetic integrity for speed.',
      jsonb_build_array(jsonb_build_object('note', coalesce(p_source, 'Quickstart'))),
      'garvis_quickstart', 'draft'
    ),
    (
      u, 'offer', 'Target Client Profile',
      E'- Brands and leaders who value strategy-led creative over task execution.\n- Clients who want a sovereign-quality identity and narrative.\n- Tone rule: professional, elevated, direct.',
      jsonb_build_array(jsonb_build_object('note', coalesce(p_source, 'Quickstart'))),
      'garvis_quickstart', 'draft'
    );

  RETURN jsonb_build_object('ok', true, 'created', 2, 'domain', 'offer');
END;
$$;

REVOKE ALL ON FUNCTION public.akb_quickstart_offer(text) FROM public;
GRANT EXECUTE ON FUNCTION public.akb_quickstart_offer(text) TO authenticated;

-- Set Offer Choice RPC: updates canonical with a specific choice
CREATE OR REPLACE FUNCTION public.akb_set_offer_choice(p_key text, p_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  u uuid := auth.uid();
BEGIN
  IF u IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Upsert into canonical
  INSERT INTO public.akb_user_canonical (user_id)
  VALUES (u)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_key = 'type' THEN
    UPDATE public.akb_user_canonical SET strategic_intent = p_value, updated_at = now() WHERE user_id = u;
  ELSIF p_key = 'buyer' THEN
    UPDATE public.akb_user_canonical SET pricing_posture = p_value, updated_at = now() WHERE user_id = u;
  ELSIF p_key = 'pricing' THEN
    UPDATE public.akb_user_canonical SET risk_profile = p_value, updated_at = now() WHERE user_id = u;
  ELSE
    RAISE EXCEPTION 'Unknown choice key: %', p_key;
  END IF;

  RETURN jsonb_build_object('ok', true, 'key', p_key, 'value', p_value);
END;
$$;

REVOKE ALL ON FUNCTION public.akb_set_offer_choice(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.akb_set_offer_choice(text, text) TO authenticated;
