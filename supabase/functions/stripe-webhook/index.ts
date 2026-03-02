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

type MembershipTier = "free" | "pro" | "club";

const normalizeTier = (value: string | null | undefined): MembershipTier | null => {
    if (!value) return null;
    const normalized = value.toLowerCase().trim();
    if (["club", "premium", "elite"].includes(normalized)) return "club";
    if (["pro", "plus", "monthly", "annual", "yearly", "anual"].includes(normalized)) return "pro";
    if (normalized === "free") return "free";
    return null;
};

const inferTierFromText = (value: string | null | undefined): MembershipTier | null => {
    if (!value) return null;
    const normalized = value.toLowerCase();
    if (normalized.includes("club") || normalized.includes("premium")) return "club";
    if (normalized.includes("pro")) return "pro";
    return null;
};

const resolveSubscriptionPlanSnapshot = async (
    subscription: Stripe.Subscription
): Promise<{ priceId: string | null; planName: string | null; tier: MembershipTier }> => {
    const item = subscription.items.data[0];
    const price = item?.price;
    const priceId = price?.id || null;

    let product: Stripe.Product | null = null;
    if (price?.product && typeof price.product !== "string") {
        product = price.product;
    } else if (price?.product && typeof price.product === "string") {
        try {
            product = await stripe.products.retrieve(price.product);
        } catch (error) {
            console.warn("Could not retrieve Stripe product for tier mapping:", error);
        }
    }

    const metadataTier =
        normalizeTier(price?.metadata?.membership_tier) ||
        normalizeTier(price?.metadata?.tier) ||
        normalizeTier(product?.metadata?.membership_tier) ||
        normalizeTier(product?.metadata?.tier);

    const inferredTier =
        inferTierFromText(price?.nickname || null) ||
        inferTierFromText(product?.name || null) ||
        inferTierFromText(priceId);

    const tier = metadataTier || inferredTier || "pro";
    const planName = product?.name || price?.nickname || null;

    return { priceId, planName, tier };
};

const refundShopOrderPointsIfNeeded = async (
    supabase: ReturnType<typeof createClient>,
    order: {
        id: string;
        user_id: string | null;
        points_used: number | null;
        points_consumed_at: string | null;
        points_refunded_at: string | null;
    },
    reason: string
): Promise<boolean> => {
    const pointsUsed = Number(order.points_used || 0);
    if (!order.user_id || pointsUsed <= 0) return false;
    if (!order.points_consumed_at) return false;
    if (order.points_refunded_at) return false;

    const { error: refundError } = await supabase.rpc("add_points_with_ttl", {
        p_user_id: order.user_id,
        p_points: pointsUsed,
        p_source_type: "purchase_refund",
        p_source_id: order.id,
        p_description: `Refund: ${reason}`,
    });

    if (refundError) {
        console.error(`Failed to refund points for order ${order.id}:`, refundError);
        return false;
    }

    const { error: markRefundedError } = await supabase
        .from("orders")
        .update({ points_refunded_at: new Date().toISOString() })
        .eq("id", order.id)
        .is("points_refunded_at", null);

    if (markRefundedError) {
        console.error(`Failed to mark points_refunded_at for order ${order.id}:`, markRefundedError);
        return false;
    }

    return true;
};

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

                let subQuery = supabase
                    .from("subscriptions")
                    .select("user_id, id")
                    .limit(1);

                if (subscriptionId) {
                    subQuery = subQuery.eq("stripe_subscription_id", subscriptionId);
                } else {
                    subQuery = subQuery.eq("stripe_customer_id", customerId);
                }

                const { data: sub } = await subQuery.maybeSingle();

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
                const planSnapshot = await resolveSubscriptionPlanSnapshot(subscription);

                const { data: sub } = await supabase
                    .from("subscriptions")
                    .update({
                        status: subscription.status,
                        cancel_at_period_end: subscription.cancel_at_period_end,
                        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        plan_id: planSnapshot.priceId || "free",
                        ...(planSnapshot.planName ? { plan_name: planSnapshot.planName } : {}),
                    })
                    .eq("stripe_subscription_id", subscription.id)
                    .select("user_id")
                    .single();

                if (sub?.user_id) {
                    let newTier: MembershipTier = "free";
                    if (["active", "trialing"].includes(subscription.status)) {
                        newTier = planSnapshot.tier;
                    }
                    await supabase
                        .from("users")
                        .update({ membership_tier: newTier })
                        .eq("id", sub.user_id);
                    console.log(
                        `Updated user ${sub.user_id} tier to ${newTier} (price: ${planSnapshot.priceId}, plan: ${planSnapshot.planName}) via subscription.updated`
                    );
                }

                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;

                const { data: sub } = await supabase
                    .from("subscriptions")
                    .update({
                        status: "canceled",
                        cancel_at_period_end: false,
                    })
                    .eq("stripe_subscription_id", subscription.id)
                    .select("user_id")
                    .single();

                if (sub?.user_id) {
                    await supabase
                        .from("users")
                        .update({ membership_tier: "free" })
                        .eq("id", sub.user_id);
                    console.log(`Updated user ${sub.user_id} tier to free via subscription.deleted`);
                }

                break;
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;
                const subscriptionId = invoice.subscription as string;

                let subQuery = supabase
                    .from("subscriptions")
                    .select("user_id, id")
                    .limit(1);

                if (subscriptionId) {
                    subQuery = subQuery.eq("stripe_subscription_id", subscriptionId);
                } else {
                    subQuery = subQuery.eq("stripe_customer_id", customerId);
                }

                const { data: sub } = await subQuery.maybeSingle();

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
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const paymentType = paymentIntent.metadata.type;

                if (paymentType === "marketplace_order") {
                    // ─── Marketplace Purchase (Connect Destination Charge) ───
                    const { data: mktOrder } = await supabase
                        .from("marketplace_orders")
                        .select("id, listing_id, buyer_id, seller_id")
                        .eq("stripe_payment_intent_id", paymentIntent.id)
                        .single();

                    if (mktOrder) {
                        await supabase
                            .from("marketplace_orders")
                            .update({
                                status: "paid",
                                paid_at: new Date().toISOString(),
                            })
                            .eq("id", mktOrder.id);

                        // Mark the listing as sold
                        await supabase
                            .from("marketplace_listings")
                            .update({
                                status: "sold",
                                updated_at: new Date().toISOString(),
                            })
                            .eq("id", mktOrder.listing_id);

                        console.log(`Marketplace order ${mktOrder.id} paid, listing ${mktOrder.listing_id} marked sold`);
                    } else {
                        console.warn(`No marketplace_order found for payment_intent: ${paymentIntent.id}`);
                    }
                } else {
                    // ─── Shop Purchase (Platform Direct Charge) ───
                    const userId = paymentIntent.metadata.user_id;
                    if (!userId) {
                        console.warn("payment_intent.succeeded without user_id in metadata");
                        break;
                    }

                    const { data: order } = await supabase
                        .from("orders")
                        .select("id, user_id, total_amount")
                        .eq("stripe_payment_intent_id", paymentIntent.id)
                        .single();

                    if (order) {
                        await supabase
                            .from("orders")
                            .update({
                                status: "paid",
                                paid_at: new Date().toISOString(),
                            })
                            .eq("id", order.id);

                        console.log(`Shop order ${order.id} marked as paid via webhook`);
                    } else {
                        console.warn(`No shop order found for payment_intent: ${paymentIntent.id}`);
                    }
                }
                break;
            }

            case "payment_intent.payment_failed":
            case "payment_intent.canceled": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const paymentType = paymentIntent.metadata.type;
                const failureMsg =
                    paymentIntent.last_payment_error?.message ||
                    (event.type === "payment_intent.canceled" ? "Payment canceled" : "Payment failed");

                if (paymentType === "marketplace_order") {
                    // ─── Marketplace Payment Failed ───
                    const { data: mktOrder } = await supabase
                        .from("marketplace_orders")
                        .select("id, listing_id")
                        .eq("stripe_payment_intent_id", paymentIntent.id)
                        .single();

                    if (mktOrder) {
                        await supabase
                            .from("marketplace_orders")
                            .update({
                                status: "payment_failed",
                                failure_reason: failureMsg,
                            })
                            .eq("id", mktOrder.id);

                        console.log(`Marketplace order ${mktOrder.id} marked as failed: ${failureMsg}`);
                    } else {
                        console.warn(`No marketplace_order found for failed payment_intent: ${paymentIntent.id}`);
                    }
                } else {
                    // ─── Shop Payment Failed ───
                    const userId = paymentIntent.metadata.user_id;
                    if (!userId) {
                        console.warn("payment_intent.payment_failed without user_id in metadata");
                        break;
                    }

                    const { data: order } = await supabase
                        .from("orders")
                        .select("id, user_id, points_used, points_consumed_at, points_refunded_at")
                        .eq("stripe_payment_intent_id", paymentIntent.id)
                        .single();

                    if (order) {
                        await supabase
                            .from("orders")
                            .update({
                                status: "payment_failed",
                                failure_reason: failureMsg,
                            })
                            .eq("id", order.id);

                        // Refund points once, only if this order already consumed them.
                        const refunded = await refundShopOrderPointsIfNeeded(supabase, order, failureMsg);
                        if (refunded) {
                            console.log(`Shop order ${order.id} failed/canceled, points refunded`);
                        } else {
                            console.log(`Shop order ${order.id} marked as failed/canceled (no points refund needed)`);
                        }
                    } else {
                        console.warn(`No shop order found for failed/canceled payment_intent: ${paymentIntent.id}`);
                    }
                }
                break;
            }

            case "charge.refunded": {
                const charge = event.data.object as Stripe.Charge;
                const piId = charge.payment_intent as string;
                if (!piId) break;

                // Try shop orders first
                const { data: shopOrder } = await supabase
                    .from("orders")
                    .select("id, user_id, points_used, points_consumed_at, points_refunded_at")
                    .eq("stripe_payment_intent_id", piId)
                    .single();

                if (shopOrder) {
                    await supabase
                        .from("orders")
                        .update({ status: "refunded" })
                        .eq("id", shopOrder.id);

                    const refunded = await refundShopOrderPointsIfNeeded(supabase, shopOrder, "Charge refunded");
                    if (refunded) {
                        console.log(`Shop order ${shopOrder.id} marked as refunded and points refunded`);
                    } else {
                        console.log(`Shop order ${shopOrder.id} marked as refunded`);
                    }
                    break;
                }

                // Try marketplace orders
                const { data: mktOrder } = await supabase
                    .from("marketplace_orders")
                    .select("id")
                    .eq("stripe_payment_intent_id", piId)
                    .single();

                if (mktOrder) {
                    await supabase
                        .from("marketplace_orders")
                        .update({ status: "refunded" })
                        .eq("id", mktOrder.id);
                    console.log(`Marketplace order ${mktOrder.id} marked as refunded`);
                }
                break;
            }

            case "charge.dispute.created": {
                const dispute = event.data.object as Stripe.Dispute;
                const piId = dispute.payment_intent as string;
                if (!piId) break;

                // Flag the order for admin review
                const { data: shopOrder } = await supabase
                    .from("orders")
                    .select("id")
                    .eq("stripe_payment_intent_id", piId)
                    .single();

                if (shopOrder) {
                    await supabase
                        .from("orders")
                        .update({ status: "disputed" })
                        .eq("id", shopOrder.id);
                    console.log(`Shop order ${shopOrder.id} flagged as disputed`);
                    break;
                }

                const { data: mktOrder } = await supabase
                    .from("marketplace_orders")
                    .select("id")
                    .eq("stripe_payment_intent_id", piId)
                    .single();

                if (mktOrder) {
                    await supabase
                        .from("marketplace_orders")
                        .update({ status: "disputed" })
                        .eq("id", mktOrder.id);
                    console.log(`Marketplace order ${mktOrder.id} flagged as disputed`);
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
