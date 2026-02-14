
-- AKB Entry source types
CREATE TYPE public.akb_source_type AS ENUM ('human', 'decision_object');

-- Autonomous Knowledge Base — append-only, immutable, authority-verified
CREATE TABLE public.akb_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  telauthorium_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  source_type akb_source_type NOT NULL DEFAULT 'human',
  source_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Telauthorium Ledger — immutable audit trail for every AKB action
CREATE TABLE public.telauthorium_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  telauthorium_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'created', 'referenced'
  actor TEXT NOT NULL DEFAULT 'human', -- 'human' or 'garvis'
  context TEXT, -- e.g. conversation_id or reason
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Generate Telauthorium IDs via DB function
CREATE OR REPLACE FUNCTION public.generate_telauthorium_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.telauthorium_id := 'TELA-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || substr(gen_random_uuid()::text, 1, 8);
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_telauthorium_id
  BEFORE INSERT ON public.akb_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_telauthorium_id();

-- Auto-log creation to ledger
CREATE OR REPLACE FUNCTION public.log_akb_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.telauthorium_ledger (user_id, telauthorium_id, action, actor, context)
  VALUES (NEW.user_id, NEW.telauthorium_id, 'created', 'human', NEW.source_conversation_id::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER akb_creation_audit
  AFTER INSERT ON public.akb_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.log_akb_creation();

-- RLS: AKB entries — SELECT and INSERT only (NO update, NO delete = immutable + append-only)
ALTER TABLE public.akb_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AKB entries"
  ON public.akb_entries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own AKB entries"
  ON public.akb_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE policies = append-only, immutable

-- RLS: Telauthorium Ledger — read-only for users
ALTER TABLE public.telauthorium_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger entries"
  ON public.telauthorium_ledger FOR SELECT
  USING (user_id = auth.uid());

-- Insert only via trigger (security definer), no direct user inserts
