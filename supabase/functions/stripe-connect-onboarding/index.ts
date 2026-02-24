import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

/**
 * Stripe Connect Onboarding Edge Function
 *
 * Handles:
 * - Creating a Stripe Connect Express account for sellers
 * - Generating an account onboarding link
 * - Checking onboarding status
 *
 * Actions:
 * - "create": Create new Connect account and return onboarding URL
 * - "refresh": Get new onboarding URL for incomplete account
 * - "status": Check if account is ready to accept payments
 */

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Return URLs - these should match your app's deep link scheme
const RETURN_URL = "corre://stripe-connect-return";
const REFRESH_URL = "corre://stripe-connect-refresh";

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Verify JWT
        const authHeader = req.headers.get("Authorization")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const body = await req.json();
        const { action } = body;

        // ─── Check Status ────────────────────────────
        if (action === "status") {
            const { data: sellerAccount } = await supabase
                .from("seller_accounts")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (!sellerAccount) {
                return new Response(JSON.stringify({
                    status: "not_created",
                    message: "No seller account found"
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // Fetch latest status from Stripe
            try {
                const account = await stripe.accounts.retrieve(sellerAccount.stripe_account_id);

                // Update local DB with current status
                await supabase
                    .from("seller_accounts")
                    .update({
                        charges_enabled: account.charges_enabled,
                        payouts_enabled: account.payouts_enabled,
                        onboarding_complete: account.details_submitted,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("user_id", user.id);

                return new Response(JSON.stringify({
                    status: account.charges_enabled ? "active" : "pending",
                    charges_enabled: account.charges_enabled,
                    payouts_enabled: account.payouts_enabled,
                    details_submitted: account.details_submitted,
                    stripe_account_id: sellerAccount.stripe_account_id,
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            } catch (stripeError) {
                console.error("Error fetching Stripe account:", stripeError);
                return new Response(JSON.stringify({
                    status: sellerAccount.charges_enabled ? "active" : "pending",
                    charges_enabled: sellerAccount.charges_enabled,
                    payouts_enabled: sellerAccount.payouts_enabled,
                    onboarding_complete: sellerAccount.onboarding_complete,
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        // ─── Create or Refresh Onboarding ────────────────────────────
        if (action === "create" || action === "refresh") {
            // Check if seller account already exists
            const { data: existingAccount } = await supabase
                .from("seller_accounts")
                .select("*")
                .eq("user_id", user.id)
                .single();

            let stripeAccountId: string;

            if (existingAccount?.stripe_account_id && !existingAccount.stripe_account_id.startsWith("acct_simulated")) {
                // Use existing Stripe account
                stripeAccountId = existingAccount.stripe_account_id;
            } else {
                // Get user info for pre-filling
                const { data: userData } = await supabase
                    .from("users")
                    .select("email, full_name")
                    .eq("id", user.id)
                    .single();

                // Create new Stripe Connect Express account
                const account = await stripe.accounts.create({
                    type: "express",
                    country: "BR", // Brazil
                    email: userData?.email || user.email,
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                    },
                    business_type: "individual",
                    metadata: {
                        supabase_user_id: user.id,
                    },
                });

                stripeAccountId = account.id;

                // Upsert seller account in DB
                if (existingAccount) {
                    await supabase
                        .from("seller_accounts")
                        .update({
                            stripe_account_id: stripeAccountId,
                            charges_enabled: false,
                            payouts_enabled: false,
                            onboarding_complete: false,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("user_id", user.id);
                } else {
                    await supabase
                        .from("seller_accounts")
                        .insert({
                            user_id: user.id,
                            stripe_account_id: stripeAccountId,
                            charges_enabled: false,
                            payouts_enabled: false,
                            onboarding_complete: false,
                        });
                }
            }

            // Create account link for onboarding
            const accountLink = await stripe.accountLinks.create({
                account: stripeAccountId,
                refresh_url: REFRESH_URL,
                return_url: RETURN_URL,
                type: "account_onboarding",
            });

            return new Response(JSON.stringify({
                url: accountLink.url,
                stripe_account_id: stripeAccountId,
                expires_at: accountLink.expires_at,
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Invalid action. Use 'create', 'refresh', or 'status'" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Stripe Connect error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
