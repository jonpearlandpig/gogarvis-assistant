
-- ============================================
-- GARVIS AKB SOVEREIGNTY ENFORCEMENT
-- Append-only • Human-authored • Forensic Logged
-- ============================================

-- Drop existing policies/triggers to avoid conflicts
DROP POLICY IF EXISTS "Users can view own AKB entries" ON public.akb_entries;
DROP POLICY IF EXISTS "Users can insert own AKB entries" ON public.akb_entries;
DROP POLICY IF EXISTS "Users can view own ledger entries" ON public.telauthorium_ledger;
DROP TRIGGER IF EXISTS set_telauthorium_id ON public.akb_entries;
DROP TRIGGER IF EXISTS akb_creation_audit ON public.akb_entries;

-- 1) RLS already enabled but ensure it
ALTER TABLE public.akb_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telauthorium_ledger ENABLE ROW LEVEL SECURITY;

-- 2) Remove any accidental update/delete rights
REVOKE UPDATE, DELETE ON public.akb_entries FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.telauthorium_ledger FROM anon, authenticated;

-- 3) SELECT policies
CREATE POLICY "akb_select_own"
ON public.akb_entries FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "ledger_select_own"
ON public.telauthorium_ledger FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 4) INSERT policies
CREATE POLICY "akb_insert_own"
ON public.akb_entries FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "ledger_insert_own"
ON public.telauthorium_ledger FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 5) Telauthorium ID Generator
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.gen_telauthorium_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  ts text := to_char(now(), 'YYYYMMDD-HH24MISS');
  rand text := substr(md5(gen_random_uuid()::text), 1, 8);
BEGIN
  RETURN 'TELA-' || ts || '-' || rand;
END;
$$;

-- 6) BEFORE INSERT: enforce constraints + generate TID
CREATE OR REPLACE FUNCTION public.akb_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_akb_before_insert ON public.akb_entries;
CREATE TRIGGER trg_akb_before_insert
BEFORE INSERT ON public.akb_entries
FOR EACH ROW EXECUTE FUNCTION public.akb_before_insert();

-- 7) AFTER INSERT: write immutable ledger record with JSON context
CREATE OR REPLACE FUNCTION public.akb_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_akb_after_insert ON public.akb_entries;
CREATE TRIGGER trg_akb_after_insert
AFTER INSERT ON public.akb_entries
FOR EACH ROW EXECUTE FUNCTION public.akb_after_insert();
