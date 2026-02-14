
-- URL sources submitted by user (append-only)
CREATE TABLE IF NOT EXISTS public.akb_url_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NULL,
  url text NOT NULL,
  normalized_url text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  http_status int NULL,
  content_type text NULL,
  content_hash text NULL,
  bytes int NULL,
  fetched_at timestamptz NULL,
  parsed_at timestamptz NULL,
  error text NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_akb_url_sources_user ON public.akb_url_sources(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_akb_url_sources_status ON public.akb_url_sources(status, created_at DESC);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.akb_url_sources_validate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('queued','fetched','parsed','failed') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be queued, fetched, parsed, or failed.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER akb_url_sources_validate_trigger
BEFORE INSERT OR UPDATE ON public.akb_url_sources
FOR EACH ROW EXECUTE FUNCTION public.akb_url_sources_validate();

-- Store extracted text chunks
CREATE TABLE IF NOT EXISTS public.akb_url_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id uuid NOT NULL REFERENCES public.akb_url_sources(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text NULL,
  text_content text NOT NULL,
  word_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_akb_url_pages_source ON public.akb_url_pages(source_id);

-- Add source tracking columns to akb_uploads
ALTER TABLE public.akb_uploads
  ADD COLUMN IF NOT EXISTS source_type text NULL,
  ADD COLUMN IF NOT EXISTS source_ref_id uuid NULL;

-- RLS
ALTER TABLE public.akb_url_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.akb_url_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "akb_url_sources_select_own" ON public.akb_url_sources
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "akb_url_sources_insert_own" ON public.akb_url_sources
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "akb_url_sources_update_own" ON public.akb_url_sources
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "akb_url_pages_select_own" ON public.akb_url_pages
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "akb_url_pages_insert_own" ON public.akb_url_pages
FOR INSERT WITH CHECK (auth.uid() = user_id);
