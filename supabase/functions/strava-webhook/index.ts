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

// Declare EdgeRuntime for Supabase Edge Functions background processing
declare const EdgeRuntime: {
    waitUntil: (promise: Promise<unknown>) => void;
} | undefined;

// ─── Configuration ───────────────────────────────────────────────────────────

const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID')!;
const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!;
const STRAVA_VERIFY_TOKEN = Deno.env.get('STRAVA_VERIFY_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log("Strava Webhook v2.2 - Async Processing & Full Compliance");

// ─── Strava Webhook Compliance Notes ─────────────────────────────────────────
// Per Strava docs (https://developers.strava.com/docs/webhooks/):
// 1. Must respond within 2 seconds with HTTP 200
// 2. Complex operations should be processed asynchronously
// 3. Strava retries up to 3 times on non-200 responses
// 4. One subscription per application covers all athletes
//
// This implementation uses EdgeRuntime.waitUntil() for background processing
// to ensure we respond quickly while still processing events.

// ─── Rate Limiting Utilities ─────────────────────────────────────────────────

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * Handles 429 rate limit errors specifically
 */
async function withRetry(
    fn: () => Promise<Response>,
    options: {
        maxRetries?: number;
        baseDelayMs?: number;
        maxDelayMs?: number;
        operationName?: string;
    } = {}
): Promise<Response> {
    const {
        maxRetries = 3,
        baseDelayMs = 100,
        maxDelayMs = 10000,
        operationName = 'operation'
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fn();

            // Handle rate limiting (429)
            if (response.status === 429) {
                // Check for Retry-After header
                const retryAfter = response.headers.get('Retry-After');
                let delayMs: number;

                if (retryAfter) {
                    // Retry-After can be seconds or a date
                    const retrySeconds = parseInt(retryAfter, 10);
                    delayMs = isNaN(retrySeconds) ? 60000 : retrySeconds * 1000;
                } else {
                    // Default: exponential backoff with jitter
                    delayMs = Math.min(
                        baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
                        maxDelayMs
                    );
                }

                console.warn(`[Rate Limit] ${operationName} hit 429, waiting ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);

                if (attempt < maxRetries) {
                    await sleep(delayMs);
                    continue;
                }
            }

            // Handle server errors (5xx) with retry
            if (response.status >= 500 && attempt < maxRetries) {
                const delayMs = Math.min(
                    baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
                    maxDelayMs
                );
                console.warn(`[Server Error] ${operationName} got ${response.status}, retrying in ${delayMs}ms`);
                await sleep(delayMs);
                continue;
            }

            return response;

        } catch (error) {
            lastError = error as Error;
            console.error(`[Error] ${operationName} attempt ${attempt + 1} failed:`, error);

            if (attempt < maxRetries) {
                const delayMs = Math.min(
                    baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
                    maxDelayMs
                );
                await sleep(delayMs);
            }
        }
    }

    // All retries exhausted
    throw lastError || new Error(`${operationName} failed after ${maxRetries + 1} attempts`);
}

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
    start_latlng?: [number, number]; // [lat, lng]
    end_latlng?: [number, number];
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

        const response = await withRetry(
            () => fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: STRAVA_CLIENT_ID,
                    client_secret: STRAVA_CLIENT_SECRET,
                    grant_type: 'refresh_token',
                    refresh_token: connection.refresh_token,
                }),
            }),
            { operationName: 'refreshStravaToken', maxRetries: 3 }
        );

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
        const response = await withRetry(
            () => fetch(
                `https://www.strava.com/api/v3/activities/${activityId}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            ),
            { operationName: `fetchStravaActivity(${activityId})`, maxRetries: 3 }
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
        start_lat: activity.start_latlng?.[0] || null,
        start_lng: activity.start_latlng?.[1] || null,
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

    if (!STRAVA_VERIFY_TOKEN) {
        console.error('STRAVA_VERIFY_TOKEN is not configured');
        return new Response('Server misconfigured', { status: 500 });
    }

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

// ─── Background Processing Helper ────────────────────────────────────────────

/**
 * Process activity sync in background to meet 2-second response requirement.
 * Uses EdgeRuntime.waitUntil() if available, otherwise runs inline.
 */
async function processActivityInBackground(
    supabase: SupabaseClient,
    athleteId: number,
    activityId: number,
    isUpdate: boolean
): Promise<void> {
    try {
        // Get user's Strava connection
        const { data: connection, error: connError } = await supabase
            .from('strava_connections')
            .select('*')
            .eq('strava_athlete_id', athleteId)
            .single();

        if (connError || !connection) {
            console.warn(`No connection found for athlete ${athleteId}`);
            return;
        }

        // Sync the activity
        const syncResult = await syncActivity(supabase, connection, activityId, isUpdate);

        if (!syncResult.success) {
            console.error(`Sync failed: ${syncResult.error}`);
            return;
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

        console.log(`[Background] Activity ${activityId} processing complete`);
    } catch (error) {
        console.error(`[Background] Error processing activity ${activityId}:`, error);
    }
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

            // Handle athlete deauthorization (quick operation - run inline)
            if (object_type === 'athlete' && updates?.authorized === 'false') {
                return await handleDeauthorization(supabase, owner_id);
            }

            // Handle activity events
            if (object_type === 'activity') {
                switch (aspect_type) {
                    case 'delete':
                        // Delete is quick - run inline
                        return await handleActivityDelete(supabase, object_id);

                    case 'create':
                    case 'update': {
                        // Activity sync requires API calls - process in background
                        // Acknowledge immediately to meet 2-second requirement
                        const isUpdate = aspect_type === 'update';

                        // Use EdgeRuntime.waitUntil for background processing if available
                        // This allows us to return immediately while continuing to process
                        const backgroundTask = processActivityInBackground(
                            supabase,
                            owner_id,
                            object_id,
                            isUpdate
                        );

                        // Check if EdgeRuntime is available (Supabase Edge Functions)
                        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
                            EdgeRuntime.waitUntil(backgroundTask);
                        } else {
                            // Fallback: await inline (may exceed 2s for slow operations)
                            await backgroundTask;
                        }

                        // Return 200 immediately
                        return new Response(
                            JSON.stringify({
                                status: 'accepted',
                                message: `Activity ${aspect_type} queued for processing`,
                                activity_id: object_id
                            }),
                            {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' }
                            }
                        );
                    }

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
