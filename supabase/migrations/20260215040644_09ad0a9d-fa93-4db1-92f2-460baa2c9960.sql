
-- Ingest Runs: tracks each upload-triggered ingest pipeline
CREATE TABLE public.ingest_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  workspace_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  source_file_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  detected_types text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'pending',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingest_runs_select_own" ON public.ingest_runs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ingest_runs_insert_own" ON public.ingest_runs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ingest_runs_update_own" ON public.ingest_runs FOR UPDATE USING (user_id = auth.uid());

CREATE TRIGGER ingest_runs_touch_updated BEFORE UPDATE ON public.ingest_runs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Ingest Entities: extracted entities from classification
CREATE TABLE public.ingest_entities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingest_id uuid NOT NULL REFERENCES public.ingest_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_name text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingest_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingest_entities_select_own" ON public.ingest_entities FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ingest_entities_insert_own" ON public.ingest_entities FOR INSERT WITH CHECK (user_id = auth.uid());

-- Ingest Proposals: draft proposals awaiting user action
CREATE TABLE public.ingest_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingest_id uuid NOT NULL REFERENCES public.ingest_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  proposal_type text NOT NULL, -- akb_draft | project_scaffold | artifact_seed
  target text NOT NULL, -- domain_key or project_id
  summary text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_excerpts jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'proposed', -- proposed | approved | denied | edited
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ingest_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingest_proposals_select_own" ON public.ingest_proposals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ingest_proposals_insert_own" ON public.ingest_proposals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ingest_proposals_update_own" ON public.ingest_proposals FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER ingest_proposals_touch_updated BEFORE UPDATE ON public.ingest_proposals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Project Scaffold Templates: industry starting kits
CREATE TABLE public.project_scaffold_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  template_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_scaffold_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scaffold_templates_select_all" ON public.project_scaffold_templates FOR SELECT USING (true);
