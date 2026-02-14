
-- Fix search_path on all AKB functions

CREATE OR REPLACE FUNCTION public.gen_telauthorium_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  ts text := to_char(now(), 'YYYYMMDD-HH24MISS');
  rand text := substr(md5(gen_random_uuid()::text), 1, 8);
BEGIN
  RETURN 'TELA-' || ts || '-' || rand;
END;
$$;

CREATE OR REPLACE FUNCTION public.akb_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF new.source_type IS NULL THEN
    new.source_type := 'human';
  END IF;

  IF new.source_type NOT IN ('human','decision_object') THEN
    RAISE EXCEPTION 'Invalid source_type. Must be human or decision_object.';
  END IF;

  IF coalesce(trim(new.title),'') = '' THEN
    RAISE EXCEPTION 'Title required.';
  END IF;

  IF coalesce(trim(new.content),'') = '' THEN
    RAISE EXCEPTION 'Content required.';
  END IF;

  IF new.telauthorium_id IS NOT NULL THEN
    RAISE EXCEPTION 'Telauthorium ID is system-generated only.';
  END IF;

  new.telauthorium_id := public.gen_telauthorium_id();
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.akb_after_insert()
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
    'AKB_ENTRY_CREATED',
    'human',
    jsonb_build_object(
      'akb_entry_id', new.id,
      'category', new.category,
      'source_type', new.source_type,
      'source_conversation_id', new.source_conversation_id
    )::text
  );
  RETURN new;
END;
$$;
