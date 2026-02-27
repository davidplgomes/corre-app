import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

/**
 * Stripe Create Subscription Edge Function
 *
 * Handles:
 * - Creating a Stripe customer (if not exists)
 * - Creating a subscription for the user
 * - Cancelling an existing subscription
 *
 * Called by: SubscriptionsApi.createSubscription() and SubscriptionsApi.cancelSubscription()
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

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Verify JWT
        const authHeader = req.headers.get("Authorization");
        console.log("[stripe-create-subscription] Auth Header present:", !!authHeader, "Length:", authHeader?.length);

        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const token = authHeader.replace("Bearer ", "");
        console.log("[stripe-create-subscription] Calling getUser with token...");

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        console.log("[stripe-create-subscription] getUser result - User ID:", user?.id, "Error:", JSON.stringify(authError));

        if (authError || !user) {
            console.error("[stripe-create-subscription] Authorization failed.", authError);
            return new Response(JSON.stringify({ error: "Unauthorized", details: authError }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const body = await req.json();
        const { action, priceId, subscriptionId } = body;

        // ─── Cancel Subscription ────────────────────────────
        if (action === "cancel" && subscriptionId) {
            const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true,
            });

            // Update local DB
            await supabase
                .from("subscriptions")
                .update({
                    cancel_at_period_end: updatedSubscription.cancel_at_period_end,
                    status: updatedSubscription.status,
                    current_period_start: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", subscriptionId)
                .eq("user_id", user.id);

            return new Response(JSON.stringify({
                success: true,
                status: updatedSubscription.status,
                cancel_at_period_end: updatedSubscription.cancel_at_period_end,
                current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ─── Create Subscription ────────────────────────────
        if (!priceId) {
            return new Response(JSON.stringify({ error: "priceId is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get or create Stripe customer
        let stripeCustomerId: string;
        console.log("[stripe-create-subscription] Looking for existing customer for user:", user.id);

        const { data: existingSub, error: subLookupError } = await supabase
            .from("subscriptions")
            .select("stripe_customer_id")
            .eq("user_id", user.id)
            .not("stripe_customer_id", "is", null)
            .limit(1)
            .maybeSingle();

        if (subLookupError) {
            console.error("[stripe-create-subscription] Error looking up existing subscription:", subLookupError);
        }

        if (existingSub?.stripe_customer_id) {
            console.log("[stripe-create-subscription] Found existing customer:", existingSub.stripe_customer_id);
            stripeCustomerId = existingSub.stripe_customer_id;
        } else {
            console.log("[stripe-create-subscription] Creating new Stripe customer for:", user.email);
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { supabase_user_id: user.id },
            });
            stripeCustomerId = customer.id;
            console.log("[stripe-create-subscription] Created customer:", stripeCustomerId);
        }

        // Create the subscription
        console.log("[stripe-create-subscription] Creating subscription with priceId:", priceId);
        const subscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: priceId }],
            payment_behavior: "default_incomplete",
            payment_settings: { save_default_payment_method: "on_subscription" },
            expand: ["latest_invoice.payment_intent"],
        });
        console.log("[stripe-create-subscription] Subscription created:", subscription.id, "status:", subscription.status);

        const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
        const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;
        console.log("[stripe-create-subscription] Payment intent:", paymentIntent?.id, "status:", paymentIntent?.status);

        // Upsert subscription in our DB
        console.log("[stripe-create-subscription] Upserting subscription to database");
        const { error: upsertError } = await supabase
            .from("subscriptions")
            .upsert({
                user_id: user.id,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: subscription.id,
                plan_id: priceId,
                plan_name: subscription.items.data[0]?.plan?.nickname || "Pro",
                status: subscription.status,
                cancel_at_period_end: subscription.cancel_at_period_end,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
            }, {
                onConflict: "stripe_subscription_id",
            });

        if (upsertError) {
            console.error("[stripe-create-subscription] Database upsert error:", upsertError);
            // Don't fail the request - subscription was created in Stripe
        }

        return new Response(
            JSON.stringify({
                subscriptionId: subscription.id,
                clientSecret: paymentIntent?.client_secret,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        // Log detailed error for debugging
        console.error("Stripe create subscription error:", {
            error,
            message: error instanceof Error ? error.message : "Unknown",
            stack: error instanceof Error ? error.stack : undefined,
            // Stripe-specific error details
            type: (error as any)?.type,
            code: (error as any)?.code,
            decline_code: (error as any)?.decline_code,
            raw: (error as any)?.raw,
        });

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const stripeCode = (error as any)?.code || (error as any)?.type || "unknown";

        return new Response(
            JSON.stringify({
                error: errorMessage,
                code: stripeCode,
                details: (error as any)?.raw?.message || null
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
