import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

/**
 * Stripe Connect Webhook Handler
 *
 * Receives Connect webhook events from Stripe and updates
 * seller account status in the database.
 *
 * Events handled:
 * - account.updated → sync charges_enabled / payouts_enabled / details_submitted
 */

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
});

const connectWebhookSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        return new Response("Missing stripe-signature", { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, connectWebhookSecret);
    } catch (err) {
        console.error("Connect webhook signature verification failed:", err);
        return new Response("Invalid signature", { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        switch (event.type) {
            case "account.updated": {
                const account = event.data.object as Stripe.Account;

                // Update seller_accounts with the latest status from Stripe
                const { error } = await supabase
                    .from("seller_accounts")
                    .update({
                        charges_enabled: account.charges_enabled ?? false,
                        payouts_enabled: account.payouts_enabled ?? false,
                        onboarding_complete: account.details_submitted ?? false,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("stripe_account_id", account.id);

                if (error) {
                    console.error(`Failed to update seller_accounts for ${account.id}:`, error);
                } else {
                    console.log(`Seller account ${account.id} updated: charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`);
                }
                break;
            }

            default:
                console.log(`Unhandled Connect event type: ${event.type}`);
        }
    } catch (error) {
        console.error("Connect webhook processing error:", error);
        return new Response(
            JSON.stringify({ error: "Webhook processing failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
    });
});
