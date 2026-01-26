// This is an example Edge Function for Strava Auth Exchange.
// Deploy: `supabase functions deploy strava-auth`

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Strava Auth Function Up!")

const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID')!;
const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!;

serve(async (req) => {
    // CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        const { code } = await req.json();

        if (!code) {
            return new Response('Missing code', { status: 400 });
        }

        // 1. Exchange code for token
        const tokenRes = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            throw new Error(tokenData.message || 'Failed to exchange token');
        }

        // 2. Save to Supabase
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Get the user ID from the Authorization header (JWT)
        const authHeader = req.headers.get('Authorization')!;
        const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

        if (userError || !user) {
            throw new Error('User not authenticated');
        }

        // Upsert connection
        const { error: dbError } = await supabase.from('strava_connections').upsert({
            user_id: user.id,
            strava_athlete_id: tokenData.athlete.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
            scope: 'read,activity:read_all'
        }, { onConflict: 'strava_athlete_id' });

        if (dbError) throw dbError;

        // Optional: Trigger initial sync?

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error: any) {
        console.error('Error in strava-auth:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
});
