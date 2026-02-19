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

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
    try {
        // Verify JWT
        const authHeader = req.headers.get("Authorization")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const body = await req.json();
        const { action, priceId, subscriptionId } = body;

        // ─── Cancel Subscription ────────────────────────────
        if (action === "cancel" && subscriptionId) {
            await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true,
            });

            // Update local DB
            await supabase
                .from("subscriptions")
                .update({ cancel_at_period_end: true, status: "canceled" })
                .eq("stripe_subscription_id", subscriptionId)
                .eq("user_id", user.id);

            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        // ─── Create Subscription ────────────────────────────
        if (!priceId) {
            return new Response(JSON.stringify({ error: "priceId is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Get or create Stripe customer
        let stripeCustomerId: string;

        const { data: existingSub } = await supabase
            .from("subscriptions")
            .select("stripe_customer_id")
            .eq("user_id", user.id)
            .not("stripe_customer_id", "is", null)
            .limit(1)
            .single();

        if (existingSub?.stripe_customer_id) {
            stripeCustomerId = existingSub.stripe_customer_id;
        } else {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { supabase_user_id: user.id },
            });
            stripeCustomerId = customer.id;
        }

        // Create the subscription
        const subscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: priceId }],
            payment_behavior: "default_incomplete",
            payment_settings: { save_default_payment_method: "on_subscription" },
            expand: ["latest_invoice.payment_intent"],
        });

        const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
        const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;

        // Upsert subscription in our DB
        await supabase
            .from("subscriptions")
            .upsert({
                user_id: user.id,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: subscription.id,
                plan_id: priceId,
                plan_name: subscription.items.data[0]?.plan?.nickname || "Pro",
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            }, {
                onConflict: "stripe_subscription_id",
            });

        return new Response(
            JSON.stringify({
                subscriptionId: subscription.id,
                clientSecret: paymentIntent?.client_secret,
            }),
            { headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Stripe error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
