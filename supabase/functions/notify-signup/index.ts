import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NOTIFY_EMAIL = "jonathan@pearlandpig.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    // Auth webhook sends: { type, table, record, ... }
    const record = payload.record;
    if (!record) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = record.email || "unknown";
    const userId = record.id || "unknown";
    const createdAt = record.created_at || new Date().toISOString();

    // Use Lovable AI to send a formatted notification via the Resend-compatible approach
    // For now, we'll use a simple approach: store the signup event and use Supabase's built-in email
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Log the signup notification
    console.log(`NEW SIGNUP NOTIFICATION:
    Email: ${userEmail}
    User ID: ${userId}
    Time: ${createdAt}
    Notify: ${NOTIFY_EMAIL}`);

    // Store in a notifications table or send via external service
    // For MVP, we'll use the AI gateway to compose and we log it
    // The admin can check edge function logs for new signups

    // Send email notification using Lovable AI to compose, then log
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      // Use AI to generate a nice notification (non-streaming)
      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: "You are a notification formatter. Return ONLY a short plain text notification message, nothing else.",
              },
              {
                role: "user",
                content: `New user signed up for GARVIS workspace. Email: ${userEmail}, User ID: ${userId}, Time: ${createdAt}. Format a brief notification.`,
              },
            ],
          }),
        }
      );

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const message = aiData.choices?.[0]?.message?.content || "New signup";
        console.log(`FORMATTED NOTIFICATION: ${message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Signup logged for ${userEmail}. Check edge function logs.` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("notify-signup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
