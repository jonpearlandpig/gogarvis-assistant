
-- Calendar provider connections (stores OAuth tokens)
CREATE TABLE public.calendar_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  provider_account_id text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamp with time zone,
  selected_calendar_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  timezone text DEFAULT 'America/New_York',
  working_hours_start text DEFAULT '09:00',
  working_hours_end text DEFAULT '17:00',
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_connections_select_own" ON public.calendar_connections
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "calendar_connections_insert_own" ON public.calendar_connections
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "calendar_connections_update_own" ON public.calendar_connections
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "calendar_connections_delete_own" ON public.calendar_connections
  FOR DELETE USING (user_id = auth.uid());

-- Cached calendar events (synced from provider)
CREATE TABLE public.calendar_events_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.calendar_connections(id) ON DELETE CASCADE,
  provider_event_id text NOT NULL,
  calendar_id text,
  title text,
  start_at timestamp with time zone NOT NULL,
  end_at timestamp with time zone NOT NULL,
  location text,
  attendees_count integer DEFAULT 0,
  is_all_day boolean DEFAULT false,
  status text DEFAULT 'confirmed',
  last_synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(connection_id, provider_event_id)
);

ALTER TABLE public.calendar_events_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_select_own" ON public.calendar_events_cache
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "calendar_events_insert_own" ON public.calendar_events_cache
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "calendar_events_update_own" ON public.calendar_events_cache
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "calendar_events_delete_own" ON public.calendar_events_cache
  FOR DELETE USING (user_id = auth.uid());

-- Trigger for updated_at on connections
CREATE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON public.calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
