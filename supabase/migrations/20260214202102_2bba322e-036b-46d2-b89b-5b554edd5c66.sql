
CREATE TABLE IF NOT EXISTS public.garvis_user_onboarding (
  user_id uuid PRIMARY KEY,
  entry_level text NOT NULL DEFAULT 'unset',
  chosen_at timestamptz NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.garvis_user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_select_own"
ON public.garvis_user_onboarding
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "onboarding_insert_own"
ON public.garvis_user_onboarding
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "onboarding_update_own"
ON public.garvis_user_onboarding
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_onboarding_touch ON public.garvis_user_onboarding;
CREATE TRIGGER trg_onboarding_touch
BEFORE UPDATE ON public.garvis_user_onboarding
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
