import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CalendarEvent = {
  id: string;
  title: string | null;
  start_at: string;
  end_at: string;
  location: string | null;
  attendees_count: number;
  is_all_day: boolean;
  status: string;
};

export type CalendarConnection = {
  id: string;
  provider: string;
  provider_account_id: string | null;
  status: string;
  timezone: string | null;
};

export function useCalendar(userId: string | null) {
  const [connection, setConnection] = useState<CalendarConnection | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnection = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("calendar_connections" as any)
      .select("id,provider,provider_account_id,status,timezone")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .single();
    setConnection(data as any);
  }, [userId]);

  const fetchEvents = useCallback(async () => {
    if (!userId) { setEvents([]); return; }
    setLoading(true);

    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const { data } = await supabase
      .from("calendar_events_cache" as any)
      .select("id,title,start_at,end_at,location,attendees_count,is_all_day,status")
      .eq("user_id", userId)
      .gte("start_at", now.toISOString())
      .lte("start_at", endOfWeek.toISOString())
      .order("start_at", { ascending: true })
      .limit(20);

    setEvents((data as any[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchConnection();
    fetchEvents();
  }, [fetchConnection, fetchEvents]);

  const isConnected = !!connection;

  return { connection, events, loading, isConnected, refresh: fetchEvents };
}
