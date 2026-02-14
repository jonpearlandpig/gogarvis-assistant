
-- Canonical AKB: user-level identity/strategy layer
CREATE TABLE IF NOT EXISTS public.akb_user_canonical (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tone_profile text,
  communication_style text,
  pricing_posture text,
  risk_profile text,
  decision_philosophy text,
  deal_breakers text[],
  strategic_intent text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.akb_user_canonical ENABLE ROW LEVEL SECURITY;

CREATE POLICY "akb_user_canonical_select_own" ON public.akb_user_canonical
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "akb_user_canonical_insert_own" ON public.akb_user_canonical
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "akb_user_canonical_update_own" ON public.akb_user_canonical
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Projects table
CREATE TABLE IF NOT EXISTS public.akb_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.akb_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "akb_projects_select_own" ON public.akb_projects
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "akb_projects_insert_own" ON public.akb_projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "akb_projects_update_own" ON public.akb_projects
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "akb_projects_delete_own" ON public.akb_projects
  FOR DELETE USING (user_id = auth.uid());

-- Project-scoped context fields
CREATE TABLE IF NOT EXISTS public.akb_project_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.akb_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  domain_key text NOT NULL,
  field_key text NOT NULL,
  value text,
  status text DEFAULT 'draft',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.akb_project_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "akb_project_context_select_own" ON public.akb_project_context
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "akb_project_context_insert_own" ON public.akb_project_context
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "akb_project_context_update_own" ON public.akb_project_context
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "akb_project_context_delete_own" ON public.akb_project_context
  FOR DELETE USING (user_id = auth.uid());

-- Trigger for updated_at on canonical
CREATE TRIGGER touch_akb_user_canonical_updated_at
  BEFORE UPDATE ON public.akb_user_canonical
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Trigger for updated_at on project context
CREATE TRIGGER touch_akb_project_context_updated_at
  BEFORE UPDATE ON public.akb_project_context
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
