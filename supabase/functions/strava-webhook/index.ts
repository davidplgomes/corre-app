// This is an example Edge Function for Strava Webhooks.
// Deploy this to Supabase using the CLI: `supabase functions deploy strava-webhook`

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Strava Webhook Function Up!")

serve(async (req) => {
    // 1. Handle Webhook Verification (GET request from Strava)
    if (req.method === 'GET') {
        const url = new URL(req.url);
        const challenge = url.searchParams.get('hub.challenge');
        const mode = url.searchParams.get('hub.mode');
        const verifyToken = url.searchParams.get('hub.verify_token');

        // You should separate verify_token in env vars ideally
        if (mode === 'subscribe' && challenge) {
            console.log("Webhook verified!");
            return new Response(JSON.stringify({ 'hub.challenge': challenge }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response('Invalid verification request', { status: 400 });
    }

    // 2. Handle Webhook Events (POST request from Strava)
    try {
        const payload = await req.json();
        const { object_type, aspect_type, object_id, owner_id } = payload;

        console.log(`Received event: ${object_type} ${aspect_type} for athlete ${owner_id}`);

        // We only care about new or updated activities
        if (object_type === 'activity' && (aspect_type === 'create' || aspect_type === 'update')) {
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL')!,
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            );

            // A. Get User's Strava Tokens from DB
            const { data: connection, error: connError } = await supabase
                .from('strava_connections')
                .select('*')
                .eq('strava_athlete_id', owner_id)
                .single();

            if (connError || !connection) {
                console.error('User not found for athlete ID:', owner_id);
                return new Response('User not found', { status: 200 }); // Return 200 to acknowledge Strava
            }

            // Check if token expired (add buffer)
            let accessToken = connection.access_token;
            if (new Date(connection.expires_at).getTime() < Date.now()) {
                // Refresh Token Logic would go here
                console.log("Token expired, refreshing...");
                // Call Strava refresh endpoint... (Implemented simplified for brevity)
            }

            // B. Fetch Activity Details from Strava API
            const activityRes = await fetch(
                `https://www.strava.com/api/v3/activities/${object_id}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!activityRes.ok) {
                console.error('Failed to fetch activity from Strava');
                return new Response('Failed to fetch activity', { status: 200 });
            }

            const activity = await activityRes.json();

            // C. Save to Database
            const { error: upsertError } = await supabase.from('strava_activities').upsert({
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
                map_polyline: activity.map?.summary_polyline,
                synced_at: new Date().toISOString()
            }, { onConflict: 'strava_id' });

            if (upsertError) {
                console.error('Error saving activity:', upsertError);
            } else {
                console.log(`Activity ${activity.id} saved successfully.`);
            }
        }

        return new Response('Event processed', { status: 200 });

    } catch (error) {
        console.error('Error processing webhook:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
});
