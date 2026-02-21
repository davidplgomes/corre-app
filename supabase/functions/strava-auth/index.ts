// Strava OAuth Edge Function
// Handles both the callback from Strava and token exchange
// Deploy: `supabase functions deploy strava-auth`

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Strava Auth Function Up!");

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const url = new URL(req.url);

    // ─── GET Request: OAuth Callback from Strava ─────────────────────────────
    // Strava redirects here after user authorizes
    if (req.method === "GET") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const state = url.searchParams.get("state"); // Contains user_id

        // Handle authorization denied
        if (error) {
            return new Response(
                generateHtmlRedirect("corre-app://strava-auth?error=denied"),
                { headers: { "Content-Type": "text/html" } }
            );
        }

        if (!code || !state) {
            return new Response(
                generateHtmlRedirect("corre-app://strava-auth?error=missing_params"),
                { headers: { "Content-Type": "text/html" } }
            );
        }

        try {
            // Exchange code for token
            const tokenRes = await fetch("https://www.strava.com/oauth/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_id: STRAVA_CLIENT_ID,
                    client_secret: STRAVA_CLIENT_SECRET,
                    code: code,
                    grant_type: "authorization_code",
                }),
            });

            const tokenData = await tokenRes.json();

            if (!tokenRes.ok) {
                console.error("Token exchange failed:", tokenData);
                return new Response(
                    generateHtmlRedirect("corre-app://strava-auth?error=token_exchange_failed"),
                    { headers: { "Content-Type": "text/html" } }
                );
            }

            // Save to Supabase using service role (since we don't have user JWT here)
            const supabase = createClient(
                SUPABASE_URL,
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            );

            // state contains the user_id
            const userId = state;

            // Upsert connection - use strava_athlete_id as conflict column (it has UNIQUE constraint)
            const { error: dbError } = await supabase.from("strava_connections").upsert(
                {
                    user_id: userId,
                    strava_athlete_id: tokenData.athlete.id,
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
                    scope: "read,activity:read_all",
                },
                { onConflict: "strava_athlete_id" }
            );

            if (dbError) {
                console.error("Database error:", dbError);
                return new Response(
                    generateHtmlRedirect("corre-app://strava-auth?error=database_error"),
                    { headers: { "Content-Type": "text/html" } }
                );
            }

            // Success! Redirect back to app
            return new Response(
                generateHtmlRedirect("corre-app://strava-auth?success=true"),
                { headers: { "Content-Type": "text/html" } }
            );
        } catch (err) {
            console.error("Strava auth error:", err);
            return new Response(
                generateHtmlRedirect("corre-app://strava-auth?error=unknown"),
                { headers: { "Content-Type": "text/html" } }
            );
        }
    }

    // ─── POST Request: Legacy token exchange (if app sends code directly) ────
    if (req.method === "POST") {
        try {
            const { code } = await req.json();

            if (!code) {
                return new Response(JSON.stringify({ error: "Missing code" }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // Exchange code for token
            const tokenRes = await fetch("https://www.strava.com/oauth/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_id: STRAVA_CLIENT_ID,
                    client_secret: STRAVA_CLIENT_SECRET,
                    code: code,
                    grant_type: "authorization_code",
                }),
            });

            const tokenData = await tokenRes.json();

            if (!tokenRes.ok) {
                throw new Error(tokenData.message || "Failed to exchange token");
            }

            // Save to Supabase
            const supabase = createClient(
                SUPABASE_URL,
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            );

            const authHeader = req.headers.get("Authorization")!;
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

            if (userError || !user) {
                throw new Error("User not authenticated");
            }

            const { error: dbError } = await supabase.from("strava_connections").upsert(
                {
                    user_id: user.id,
                    strava_athlete_id: tokenData.athlete.id,
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
                    scope: "read,activity:read_all",
                },
                { onConflict: "strava_athlete_id" }
            );

            if (dbError) throw dbError;

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        } catch (error: any) {
            console.error("Error in strava-auth POST:", error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
    }

    return new Response("Method not allowed", { status: 405 });
});

/**
 * Generate HTML page that redirects to app via custom URL scheme
 */
function generateHtmlRedirect(appUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Redirecting to Corre App...</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #000;
            color: #fff;
        }
        .container { text-align: center; padding: 20px; }
        h1 { color: #FF5722; }
        a { color: #FF5722; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Corre</h1>
        <p>Connecting to Strava...</p>
        <p>If you're not redirected automatically, <a href="${appUrl}">tap here</a>.</p>
    </div>
    <script>
        window.location.href = "${appUrl}";
    </script>
</body>
</html>
`;
}
