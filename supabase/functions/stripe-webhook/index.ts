import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

/**
 * Stripe Webhook Handler Edge Function
 * 
 * Receives webhook events from Stripe and syncs the subscription
 * and transaction data into our Supabase tables.
 * 
 * Important events:
 * - invoice.payment_succeeded → record transaction
 * - customer.subscription.updated → sync subscription status
 * - customer.subscription.deleted → mark subscription as canceled
 */

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
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
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response("Invalid signature", { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        switch (event.type) {
            case "invoice.payment_succeeded": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;
                const subscriptionId = invoice.subscription as string;

                // Find user by stripe_customer_id
                const { data: sub } = await supabase
                    .from("subscriptions")
                    .select("user_id, id")
                    .eq("stripe_customer_id", customerId)
                    .single();

                if (sub) {
                    await supabase
                        .from("transactions")
                        .insert({
                            user_id: sub.user_id,
                            subscription_id: sub.id,
                            stripe_payment_intent_id: invoice.payment_intent as string,
                            amount: invoice.amount_paid,
                            currency: invoice.currency,
                            status: "succeeded",
                            description: `Invoice ${invoice.number || invoice.id}`,
                            metadata: { stripe_invoice_id: invoice.id },
                        });
                }
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;

                await supabase
                    .from("subscriptions")
                    .update({
                        status: subscription.status,
                        cancel_at_period_end: subscription.cancel_at_period_end,
                        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    })
                    .eq("stripe_subscription_id", subscription.id);

                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;

                await supabase
                    .from("subscriptions")
                    .update({
                        status: "canceled",
                        cancel_at_period_end: false,
                    })
                    .eq("stripe_subscription_id", subscription.id);

                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                const { data: sub } = await supabase
                    .from("subscriptions")
                    .select("user_id, id")
                    .eq("stripe_customer_id", customerId)
                    .single();

                if (sub) {
                    await supabase
                        .from("transactions")
                        .insert({
                            user_id: sub.user_id,
                            subscription_id: sub.id,
                            stripe_payment_intent_id: invoice.payment_intent as string,
                            amount: invoice.amount_due,
                            currency: invoice.currency,
                            status: "failed",
                            description: `Failed: Invoice ${invoice.number || invoice.id}`,
                        });
                }
                break;
            }

            case "payment_intent.succeeded": {
                // One-time payment for marketplace purchases
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const userId = paymentIntent.metadata.user_id;

                if (!userId) {
                    console.warn("payment_intent.succeeded without user_id in metadata");
                    break;
                }

                // Find the order by payment intent ID
                const { data: order } = await supabase
                    .from("orders")
                    .select("id, user_id, total_amount")
                    .eq("stripe_payment_intent_id", paymentIntent.id)
                    .single();

                if (order) {
                    // Mark order as paid
                    await supabase
                        .from("orders")
                        .update({
                            status: "paid",
                            paid_at: new Date().toISOString(),
                        })
                        .eq("id", order.id);

                    console.log(`Order ${order.id} marked as paid via webhook`);
                } else {
                    console.warn(`No order found for payment_intent: ${paymentIntent.id}`);
                }
                break;
            }

            case "payment_intent.payment_failed": {
                // Payment failed for marketplace purchase
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const userId = paymentIntent.metadata.user_id;

                if (!userId) {
                    console.warn("payment_intent.payment_failed without user_id in metadata");
                    break;
                }

                // Find the order by payment intent ID
                const { data: order } = await supabase
                    .from("orders")
                    .select("id, user_id, points_used")
                    .eq("stripe_payment_intent_id", paymentIntent.id)
                    .single();

                if (order) {
                    // Mark order as failed
                    await supabase
                        .from("orders")
                        .update({
                            status: "payment_failed",
                            failure_reason: paymentIntent.last_payment_error?.message || "Payment failed",
                        })
                        .eq("id", order.id);

                    // Refund points if they were used
                    if (order.points_used && order.points_used > 0) {
                        await supabase.rpc("add_points_with_ttl", {
                            p_user_id: order.user_id,
                            p_points: order.points_used,
                            p_source_type: "purchase_refund",
                            p_source_id: order.id,
                            p_description: "Refund: Payment failed",
                        });

                        console.log(`Order ${order.id} marked as failed, ${order.points_used} points refunded`);
                    } else {
                        console.log(`Order ${order.id} marked as failed (no points to refund)`);
                    }
                } else {
                    console.warn(`No order found for failed payment_intent: ${paymentIntent.id}`);
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error("Webhook processing error:", error);
        return new Response(
            JSON.stringify({ error: "Webhook processing failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
    });
});
