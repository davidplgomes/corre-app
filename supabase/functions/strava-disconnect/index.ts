import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing Authorization header" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: connection, error: connectionError } = await admin
      .from("strava_connections")
      .select("id, user_id, access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connectionError) {
      return new Response(JSON.stringify({ success: false, error: "Failed to load connection" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!connection) {
      return new Response(JSON.stringify({ success: true, disconnected: false }), {
        headers: corsHeaders,
      });
    }

    if (connection.access_token) {
      try {
        await fetch("https://www.strava.com/oauth/deauthorize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${connection.access_token}`,
            "Content-Type": "application/json",
          },
        });
      } catch (deauthError) {
        console.warn("strava-disconnect: deauthorize request failed", deauthError);
      }
    }

    const { error: activitiesDeleteError } = await admin
      .from("strava_activities")
      .delete()
      .eq("user_id", user.id);

    if (activitiesDeleteError) {
      return new Response(JSON.stringify({ success: false, error: "Failed to delete Strava activities" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { error: connDeleteError } = await admin
      .from("strava_connections")
      .delete()
      .eq("user_id", user.id);

    if (connDeleteError) {
      return new Response(JSON.stringify({ success: false, error: "Failed to delete Strava connection" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    await admin.from("notifications").insert({
      user_id: user.id,
      title: "Strava disconnected",
      body: "Your Strava connection was removed. You can reconnect anytime in Settings.",
      type: "general",
      data: { source: "user_disconnect" },
    });

    return new Response(JSON.stringify({ success: true, disconnected: true }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("strava-disconnect error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to disconnect Strava",
      }),
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  }
});
