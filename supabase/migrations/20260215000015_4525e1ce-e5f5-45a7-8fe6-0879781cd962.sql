
-- 1) Extend akb_domains with lock + progress metadata
ALTER TABLE public.akb_domains
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS min_met boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS progress_json jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Helper function: lock a domain (only if min_met = true)
CREATE OR REPLACE FUNCTION public.akb_lock_domain(p_domain_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.akb_domains
  SET locked = true,
      locked_at = now(),
      status = 'complete',
      completed_at = COALESCE(completed_at, now())
  WHERE user_id = auth.uid()
    AND domain_key = p_domain_key
    AND min_met = true;
END;
$$;

REVOKE ALL ON FUNCTION public.akb_lock_domain(text) FROM public;
GRANT EXECUTE ON FUNCTION public.akb_lock_domain(text) TO authenticated;
