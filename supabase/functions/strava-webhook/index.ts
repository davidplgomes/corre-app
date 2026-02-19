/**
 * Strava Webhook Handler
 *
 * Handles all Strava webhook events:
 * - GET: Webhook subscription verification
 * - POST activity.create: Sync new activity and award points
 * - POST activity.update: Re-sync activity (update cached_until, no points)
 * - POST activity.delete: Remove cached activity data
 * - POST athlete.deauthorization: Delete all user's Strava data
 *
 * Deploy: `supabase functions deploy strava-webhook`
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Configuration ───────────────────────────────────────────────────────────

const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID')!;
const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!;
const STRAVA_VERIFY_TOKEN = Deno.env.get('STRAVA_VERIFY_TOKEN') || 'CORRE_STRAVA_VERIFY';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log("Strava Webhook v2.0 - Compliance & Gamification Ready");

// ─── Types ───────────────────────────────────────────────────────────────────

interface StravaConnection {
    id: string;
    user_id: string;
    strava_athlete_id: number;
    access_token: string;
    refresh_token: string;
    expires_at: string;
}

interface StravaWebhookPayload {
    object_type: 'activity' | 'athlete';
    aspect_type: 'create' | 'update' | 'delete';
    object_id: number;
    owner_id: number;
    subscription_id: number;
    event_time: number;
    updates?: {
        title?: string;
        type?: string;
        private?: string;
        authorized?: string;
    };
}

interface StravaActivity {
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
    map?: {
        summary_polyline?: string;
    };
}

// ─── Helper: Create Supabase Client ──────────────────────────────────────────

function getSupabaseClient(): SupabaseClient {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ─── Helper: Refresh Strava Token ────────────────────────────────────────────

async function refreshStravaToken(
    supabase: SupabaseClient,
    connection: StravaConnection
): Promise<string | null> {
    try {
        console.log(`Refreshing token for athlete ${connection.strava_athlete_id}`);

        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: connection.refresh_token,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Token refresh failed:', response.status, errorText);
            return null;
        }

        const tokenData = await response.json();

        // Update tokens in database
        const { error: updateError } = await supabase
            .from('strava_connections')
            .update({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', connection.id);

        if (updateError) {
            console.error('Failed to save refreshed token:', updateError);
            return null;
        }

        console.log(`Token refreshed successfully for athlete ${connection.strava_athlete_id}`);
        return tokenData.access_token;
    } catch (error) {
        console.error('Token refresh error:', error);
        return null;
    }
}

// ─── Helper: Get Valid Access Token ──────────────────────────────────────────

async function getValidAccessToken(
    supabase: SupabaseClient,
    connection: StravaConnection
): Promise<string | null> {
    const expiresAt = new Date(connection.expires_at).getTime();
    const now = Date.now();
    const BUFFER_MS = 5 * 60 * 1000; // 5 minute buffer before expiry

    if (expiresAt - now < BUFFER_MS) {
        console.log('Token expiring soon or expired, refreshing...');
        return await refreshStravaToken(supabase, connection);
    }

    return connection.access_token;
}

// ─── Helper: Fetch Activity from Strava ──────────────────────────────────────

async function fetchStravaActivity(
    activityId: number,
    accessToken: string
): Promise<StravaActivity | null> {
    try {
        const response = await fetch(
            `https://www.strava.com/api/v3/activities/${activityId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Strava API error ${response.status}:`, errorText);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching activity from Strava:', error);
        return null;
    }
}

// ─── Helper: Sync Activity to Database ───────────────────────────────────────

async function syncActivity(
    supabase: SupabaseClient,
    connection: StravaConnection,
    activityId: number,
    isUpdate: boolean
): Promise<{ success: boolean; error?: string }> {
    // Get valid access token (refresh if needed)
    const accessToken = await getValidAccessToken(supabase, connection);

    if (!accessToken) {
        return { success: false, error: 'Failed to get valid access token' };
    }

    // Fetch activity details from Strava API
    const activity = await fetchStravaActivity(activityId, accessToken);

    if (!activity) {
        return { success: false, error: 'Failed to fetch activity from Strava' };
    }

    // Calculate cached_until (7 days from now per Strava API terms)
    const cachedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Prepare activity data for upsert
    const activityData = {
        user_id: connection.user_id,
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
        cached_until: cachedUntil,
        synced_at: new Date().toISOString(),
    };

    // Upsert activity data (don't overwrite points_awarded on update)
    const { error: upsertError } = await supabase
        .from('strava_activities')
        .upsert(activityData, {
            onConflict: 'strava_id',
            ignoreDuplicates: false
        });

    if (upsertError) {
        console.error('Error saving activity:', upsertError);
        return { success: false, error: upsertError.message };
    }

    console.log(`Activity ${activity.id} synced (${isUpdate ? 'update' : 'create'}): ${activity.name} - ${(activity.distance / 1000).toFixed(2)} km`);

    return { success: true };
}

// ─── Handler: Webhook Verification (GET) ─────────────────────────────────────

function handleVerification(url: URL): Response {
    const challenge = url.searchParams.get('hub.challenge');
    const mode = url.searchParams.get('hub.mode');
    const verifyToken = url.searchParams.get('hub.verify_token');

    console.log(`Verification request: mode=${mode}, token=${verifyToken ? '***' : 'missing'}`);

    if (mode === 'subscribe' && verifyToken === STRAVA_VERIFY_TOKEN && challenge) {
        console.log('Webhook subscription verified!');
        return new Response(
            JSON.stringify({ 'hub.challenge': challenge }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    }

    console.warn('Invalid verification request');
    return new Response('Invalid verification request', { status: 400 });
}

// ─── Handler: Deauthorization Event ──────────────────────────────────────────

async function handleDeauthorization(
    supabase: SupabaseClient,
    athleteId: number
): Promise<Response> {
    console.log(`Processing deauthorization for athlete ${athleteId}`);

    const { error } = await supabase.rpc('delete_user_strava_data', {
        p_strava_athlete_id: athleteId
    });

    if (error) {
        console.error('Deauthorization error:', error);
    } else {
        console.log(`Successfully deleted all data for athlete ${athleteId}`);
    }

    // Always return 200 to acknowledge the webhook
    return new Response('Deauthorization processed', { status: 200 });
}

// ─── Handler: Activity Delete Event ──────────────────────────────────────────

async function handleActivityDelete(
    supabase: SupabaseClient,
    activityId: number
): Promise<Response> {
    console.log(`Processing activity deletion: ${activityId}`);

    const { error } = await supabase.rpc('delete_strava_activity', {
        p_strava_activity_id: activityId
    });

    if (error) {
        console.error('Activity deletion error:', error);
    } else {
        console.log(`Deleted activity ${activityId}`);
    }

    return new Response('Delete processed', { status: 200 });
}

// ─── Handler: Activity Create/Update Event ───────────────────────────────────

async function handleActivitySync(
    supabase: SupabaseClient,
    athleteId: number,
    activityId: number,
    isUpdate: boolean
): Promise<Response> {
    console.log(`Processing activity ${isUpdate ? 'update' : 'create'}: ${activityId} for athlete ${athleteId}`);

    // Get user's Strava connection
    const { data: connection, error: connError } = await supabase
        .from('strava_connections')
        .select('*')
        .eq('strava_athlete_id', athleteId)
        .single();

    if (connError || !connection) {
        console.warn(`No connection found for athlete ${athleteId}`);
        return new Response('User not found', { status: 200 }); // Return 200 to acknowledge
    }

    // Sync the activity
    const syncResult = await syncActivity(supabase, connection, activityId, isUpdate);

    if (!syncResult.success) {
        console.error(`Sync failed: ${syncResult.error}`);
        return new Response('Sync failed', { status: 200 }); // Still 200 to acknowledge
    }

    // Award points ONLY for new activities (create), never for updates
    if (!isUpdate) {
        console.log(`Awarding points for new activity ${activityId}`);

        const { data: pointsResult, error: pointsError } = await supabase.rpc(
            'award_strava_activity_points',
            { p_strava_activity_id: activityId }
        );

        if (pointsError) {
            console.error('Points award error:', pointsError);
        } else {
            console.log('Points result:', JSON.stringify(pointsResult));
        }
    }

    return new Response('Activity processed', { status: 200 });
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    const url = new URL(req.url);

    // Handle webhook verification (GET request from Strava)
    if (req.method === 'GET') {
        return handleVerification(url);
    }

    // Handle webhook events (POST request from Strava)
    if (req.method === 'POST') {
        try {
            const payload: StravaWebhookPayload = await req.json();
            const { object_type, aspect_type, object_id, owner_id, updates } = payload;

            console.log(`[Webhook] ${object_type}.${aspect_type} | ID: ${object_id} | Athlete: ${owner_id}`);

            const supabase = getSupabaseClient();

            // Handle athlete deauthorization
            if (object_type === 'athlete' && updates?.authorized === 'false') {
                return await handleDeauthorization(supabase, owner_id);
            }

            // Handle activity events
            if (object_type === 'activity') {
                switch (aspect_type) {
                    case 'delete':
                        return await handleActivityDelete(supabase, object_id);

                    case 'create':
                        return await handleActivitySync(supabase, owner_id, object_id, false);

                    case 'update':
                        return await handleActivitySync(supabase, owner_id, object_id, true);

                    default:
                        console.log(`Unhandled activity aspect: ${aspect_type}`);
                }
            }

            // Acknowledge unknown events
            console.log(`Unhandled event: ${object_type}.${aspect_type}`);
            return new Response('Event acknowledged', { status: 200 });

        } catch (error) {
            console.error('Webhook processing error:', error);
            // Return 200 even on error to prevent Strava from retrying
            return new Response('Error processing webhook', { status: 200 });
        }
    }

    // Method not allowed
    return new Response('Method not allowed', { status: 405 });
});
