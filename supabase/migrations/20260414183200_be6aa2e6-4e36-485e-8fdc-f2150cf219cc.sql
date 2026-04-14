
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  key_hash text NOT NULL,
  label text NOT NULL DEFAULT 'Untitled key',
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone
);

CREATE UNIQUE INDEX idx_api_keys_key_hash ON public.api_keys (key_hash);
CREATE INDEX idx_api_keys_user_id ON public.api_keys (user_id);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_own" ON public.api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "api_keys_insert_own" ON public.api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "api_keys_update_own" ON public.api_keys
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "api_keys_delete_own" ON public.api_keys
  FOR DELETE USING (user_id = auth.uid());
