import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StravaConnection = {
    id: string;
    user_id: string;
    strava_athlete_id: number;
    access_token: string;
    refresh_token: string;
    expires_at: string;
};

type StravaActivity = {
    id: number;
    name: string;
    type: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    total_elevation_gain: number;
    start_date: string;
    average_speed: number;
    max_speed: number;
    average_heartrate?: number;
    start_latlng?: [number, number];
    map?: {
        summary_polyline?: string;
    };
};

type StravaAwardResult = {
    success?: boolean;
    points_awarded?: number;
    xp_awarded?: number;
};

const getServiceClient = (): SupabaseClient =>
    createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

async function refreshStravaToken(
    supabase: SupabaseClient,
    connection: StravaConnection
): Promise<string | null> {
    try {
        const tokenRes = await fetch("https://www.strava.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: connection.refresh_token,
            }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) {
            console.error("Failed to refresh Strava token:", tokenData);
            return null;
        }

        const { error: updateError } = await supabase
            .from("strava_connections")
            .update({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);

        if (updateError) {
            console.error("Failed to persist refreshed Strava token:", updateError);
            return null;
        }

        return tokenData.access_token;
    } catch (error) {
        console.error("Unexpected Strava token refresh error:", error);
        return null;
    }
}

async function getValidAccessToken(
    supabase: SupabaseClient,
    connection: StravaConnection
): Promise<string | null> {
    const expiresAt = new Date(connection.expires_at).getTime();
    const bufferMs = 5 * 60 * 1000;
    if (expiresAt - Date.now() > bufferMs) {
        return connection.access_token;
    }
    return refreshStravaToken(supabase, connection);
}

async function fetchRecentActivities(
    accessToken: string,
    perPage: number,
    daysBack: number
): Promise<StravaActivity[] | null> {
    try {
        const afterEpoch = Math.floor(Date.now() / 1000) - daysBack * 24 * 60 * 60;
        const url =
            `https://www.strava.com/api/v3/athlete/activities?` +
            `per_page=${perPage}&page=1&after=${afterEpoch}`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to fetch Strava activities:", response.status, errorText);
            return null;
        }

        const activities = (await response.json()) as StravaActivity[];
        return Array.isArray(activities) ? activities : [];
    } catch (error) {
        console.error("Unexpected error fetching Strava activities:", error);
        return null;
    }
}

async function syncActivities(
    supabase: SupabaseClient,
    userId: string,
    activities: StravaActivity[]
): Promise<{ activitiesSynced: number; pointsAwarded: number; xpAwarded: number }> {
    let activitiesSynced = 0;
    let pointsAwarded = 0;
    let xpAwarded = 0;

    for (const activity of activities) {
        const cachedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error: upsertError } = await supabase
            .from("strava_activities")
            .upsert(
                {
                    user_id: userId,
                    strava_id: activity.id,
                    activity_type: activity.type,
                    name: activity.name,
                    distance_meters: activity.distance,
                    moving_time_seconds: activity.moving_time,
                    elapsed_time_seconds: activity.elapsed_time,
                    total_elevation_gain: activity.total_elevation_gain,
                    start_date: activity.start_date,
                    average_speed: activity.average_speed,
                    max_speed: activity.max_speed,
                    average_heartrate: activity.average_heartrate || null,
                    map_polyline: activity.map?.summary_polyline || null,
                    start_lat: activity.start_latlng?.[0] || null,
                    start_lng: activity.start_latlng?.[1] || null,
                    cached_until: cachedUntil,
                    synced_at: new Date().toISOString(),
                },
                { onConflict: "strava_id", ignoreDuplicates: false }
            );

        if (upsertError) {
            console.error(`Failed to upsert Strava activity ${activity.id}:`, upsertError);
            continue;
        }

        activitiesSynced += 1;

        if (!["Run", "TrailRun", "VirtualRun"].includes(activity.type)) {
            continue;
        }

        const { data: awardData, error: awardError } = await supabase.rpc(
            "award_strava_activity_points",
            { p_strava_activity_id: activity.id }
        );

        if (awardError) {
            console.error(`Failed to award points for Strava activity ${activity.id}:`, awardError);
            continue;
        }

        const parsed = (awardData || {}) as StravaAwardResult;
        if (parsed.success) {
            pointsAwarded += parsed.points_awarded || 0;
            xpAwarded += parsed.xp_awarded || 0;
        }
    }

    return { activitiesSynced, pointsAwarded, xpAwarded };
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ success: false, error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
            JSON.stringify({ success: false, error: "Missing authorization header" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = getServiceClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
        return new Response(
            JSON.stringify({ success: false, error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action || "manual_sync";
    const perPage = clamp(Number(body?.per_page || 30), 1, 50);
    const daysBack = clamp(Number(body?.days_back || 21), 1, 90);

    if (action !== "manual_sync") {
        return new Response(
            JSON.stringify({ success: false, error: "Unsupported action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const { data: connection, error: connectionError } = await supabase
        .from("strava_connections")
        .select("id, user_id, strava_athlete_id, access_token, refresh_token, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

    if (connectionError) {
        return new Response(
            JSON.stringify({ success: false, error: connectionError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (!connection) {
        return new Response(
            JSON.stringify({ success: false, error: "No Strava connection found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const validToken = await getValidAccessToken(supabase, connection as StravaConnection);
    if (!validToken) {
        return new Response(
            JSON.stringify({ success: false, error: "Failed to refresh Strava token" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const activities = await fetchRecentActivities(validToken, perPage, daysBack);
    if (!activities) {
        return new Response(
            JSON.stringify({ success: false, error: "Could not fetch activities from Strava" }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const { activitiesSynced, pointsAwarded, xpAwarded } = await syncActivities(supabase, user.id, activities);

    return new Response(
        JSON.stringify({
            success: true,
            activities_synced: activitiesSynced,
            points_awarded: pointsAwarded,
            xp_awarded: xpAwarded,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
});
