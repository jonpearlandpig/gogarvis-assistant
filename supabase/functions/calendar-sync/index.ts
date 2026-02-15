import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── ACTION: get_auth_url ──
    // Returns the Google OAuth URL for the user to consent
    if (action === "get_auth_url") {
      const redirectUri = url.searchParams.get("redirect_uri") || "";
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        access_type: "offline",
        prompt: "consent",
        state: user.id,
      });
      return new Response(
        JSON.stringify({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: exchange_code ──
    // Exchange authorization code for tokens
    if (action === "exchange_code") {
      const body = await req.json();
      const { code, redirect_uri } = body;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenRes.json();
      if (tokens.error) {
        return new Response(JSON.stringify({ error: tokens.error_description || tokens.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Google user info for provider_account_id
      const userInfoRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      const calendarInfo = await userInfoRes.json();

      // Store connection
      const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

      await supabase.from("calendar_connections").upsert(
        {
          user_id: user.id,
          provider: "google",
          provider_account_id: calendarInfo.id || null,
          access_token_encrypted: tokens.access_token,
          refresh_token_encrypted: tokens.refresh_token || null,
          token_expires_at: expiresAt,
          status: "active",
        },
        { onConflict: "user_id,provider" }
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: sync ──
    // Fetch events from Google Calendar and cache them
    if (action === "sync") {
      const { data: conn } = await supabase
        .from("calendar_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "google")
        .eq("status", "active")
        .single();

      if (!conn) {
        return new Response(JSON.stringify({ error: "No active calendar connection" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = conn.access_token_encrypted;

      // Refresh token if expired
      if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: conn.refresh_token_encrypted,
            grant_type: "refresh_token",
          }),
        });
        const refreshed = await refreshRes.json();
        if (refreshed.access_token) {
          accessToken = refreshed.access_token;
          const expiresAt = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
          await supabase
            .from("calendar_connections")
            .update({ access_token_encrypted: accessToken, token_expires_at: expiresAt })
            .eq("id", conn.id);
        }
      }

      // Fetch next 7 days of events
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 7 * 86400000).toISOString();

      const eventsRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "50",
          }),
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const eventsData = await eventsRes.json();
      const items = eventsData.items || [];

      // Upsert events
      const rows = items.map((e: any) => ({
        user_id: user.id,
        connection_id: conn.id,
        provider_event_id: e.id,
        calendar_id: "primary",
        title: e.summary || null,
        start_at: e.start?.dateTime || e.start?.date || timeMin,
        end_at: e.end?.dateTime || e.end?.date || timeMin,
        location: e.location || null,
        attendees_count: (e.attendees || []).length,
        is_all_day: !e.start?.dateTime,
        status: e.status || "confirmed",
        last_synced_at: new Date().toISOString(),
      }));

      if (rows.length > 0) {
        await supabase
          .from("calendar_events_cache")
          .upsert(rows, { onConflict: "connection_id,provider_event_id" });
      }

      return new Response(
        JSON.stringify({ ok: true, synced: rows.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
