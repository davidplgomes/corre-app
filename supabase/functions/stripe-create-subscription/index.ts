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

type MembershipTier = "free" | "pro" | "club";
type XpLevel = "starter" | "pacer" | "elite";
const MANAGEABLE_SUB_STATUSES = ["active", "trialing", "past_due", "unpaid", "incomplete"] as const;
const XP_MONTHLY_DISCOUNT_BY_LEVEL: Record<XpLevel, number> = {
    starter: 0,
    pacer: 5,
    elite: 10,
};

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

const normalizeXpLevel = (value: string | null | undefined): XpLevel => {
    const normalized = (value || "").toLowerCase().trim();
    if (normalized === "pacer") return "pacer";
    if (normalized === "elite") return "elite";
    return "starter";
};

const getPlanSnapshotFromPriceId = async (
    priceId: string
): Promise<{ planName: string; tier: MembershipTier; interval: Stripe.Price.Recurring.Interval | null }> => {
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    const product = typeof price.product === "string"
        ? await stripe.products.retrieve(price.product)
        : price.product;

    const metadataTier =
        normalizeTier(price.metadata?.membership_tier) ||
        normalizeTier(price.metadata?.tier) ||
        normalizeTier(product?.metadata?.membership_tier) ||
        normalizeTier(product?.metadata?.tier);

    const inferredTier =
        inferTierFromText(price.nickname) ||
        inferTierFromText(product?.name) ||
        inferTierFromText(price.id);

    const tier = metadataTier || inferredTier || "pro";
    const planName = product?.name || price.nickname || "Pro";
    const interval = price.recurring?.interval || null;

    return { planName, tier, interval };
};

const resolveXpMonthlyDiscount = async (
    supabase: ReturnType<typeof createClient>,
    userId: string,
    interval: Stripe.Price.Recurring.Interval | null
): Promise<{ level: XpLevel; percent: number }> => {
    const { data: userRow, error } = await supabase
        .from("users")
        .select("xp_level")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        console.warn("[stripe-create-subscription] Failed to read user xp_level:", error);
    }

    const level = normalizeXpLevel((userRow as { xp_level?: string | null } | null)?.xp_level || null);
    if (interval !== "month") {
        return { level, percent: 0 };
    }

    return {
        level,
        percent: XP_MONTHLY_DISCOUNT_BY_LEVEL[level] || 0,
    };
};

const ensureXpDiscountCoupon = async (percent: number): Promise<string | null> => {
    if (!Number.isFinite(percent) || percent <= 0) return null;
    const normalized = Math.max(1, Math.min(90, Math.floor(percent)));
    const couponId = `corre_xp_monthly_${normalized}`;

    try {
        const existing = await stripe.coupons.retrieve(couponId);
        if (!existing?.valid) {
            throw new Error(`Coupon ${couponId} exists but is not valid.`);
        }
        return existing.id;
    } catch (error) {
        const code = (error as { code?: string })?.code;
        const rawCode = (error as { raw?: { code?: string } })?.raw?.code;
        const statusCode = (error as { statusCode?: number })?.statusCode;
        const notFound = code === "resource_missing" || rawCode === "resource_missing" || statusCode === 404;

        if (!notFound) {
            console.warn("[stripe-create-subscription] Unexpected coupon lookup error:", error);
            throw error;
        }
    }

    const created = await stripe.coupons.create({
        id: couponId,
        percent_off: normalized,
        duration: "forever",
        name: `Corre XP ${normalized}% (Monthly)`,
        metadata: {
            source: "xp_level_discount",
            cadence: "monthly",
            percent: String(normalized),
        },
    });

    return created.id;
};

const subscriptionCouponId = (subscription: Stripe.Subscription): string | null => {
    const discount = subscription.discount;
    const coupon = discount?.coupon;
    if (!coupon) return null;
    if (typeof coupon === "string") return coupon;
    return coupon.id || null;
};

const getPaymentIntentClientSecretFromSubscription = (
    subscription: Stripe.Subscription
): string | undefined => {
    const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent | null;
    return paymentIntent?.client_secret || undefined;
};

const upsertSubscriptionRecord = async (
    supabase: ReturnType<typeof createClient>,
    userId: string,
    stripeCustomerId: string,
    subscription: Stripe.Subscription,
    planId: string,
    planName: string
) => {
    const { error } = await supabase
        .from("subscriptions")
        .upsert({
            user_id: userId,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: subscription.id,
            plan_id: planId,
            plan_name: planName,
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        }, {
            onConflict: "stripe_subscription_id",
        });

    if (error) {
        console.error("[stripe-create-subscription] Database upsert error:", error);
    }
};

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
        const action = typeof body?.action === "string" ? body.action : "create";
        const priceId = typeof body?.priceId === "string" ? body.priceId : undefined;
        const subscriptionId = typeof body?.subscriptionId === "string" ? body.subscriptionId : undefined;

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

        // ─── Resume Subscription Cancellation ───────────────
        if (action === "resume" && subscriptionId) {
            const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: false,
            });

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

        const planSnapshot = await getPlanSnapshotFromPriceId(priceId);
        const xpDiscountContext = await resolveXpMonthlyDiscount(supabase, user.id, planSnapshot.interval);
        let discountCouponId: string | null = null;

        try {
            discountCouponId = await ensureXpDiscountCoupon(xpDiscountContext.percent);
        } catch (couponError) {
            console.warn(
                "[stripe-create-subscription] Failed to resolve XP discount coupon. Continuing without discount:",
                couponError
            );
            discountCouponId = null;
        }

        const targetDiscounts = discountCouponId ? [{ coupon: discountCouponId }] : [];

        const { data: existingManageableSub, error: existingManageableSubError } = await supabase
            .from("subscriptions")
            .select("stripe_subscription_id")
            .eq("user_id", user.id)
            .not("stripe_subscription_id", "is", null)
            .in("status", [...MANAGEABLE_SUB_STATUSES])
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingManageableSubError) {
            console.warn(
                "[stripe-create-subscription] Could not look up existing manageable subscription:",
                existingManageableSubError
            );
        }

        if (existingManageableSub?.stripe_subscription_id) {
            console.log(
                "[stripe-create-subscription] Found manageable subscription, updating in place:",
                existingManageableSub.stripe_subscription_id
            );

            try {
                const existingStripeSubscription = await stripe.subscriptions.retrieve(
                    existingManageableSub.stripe_subscription_id,
                    { expand: ["latest_invoice.payment_intent"] }
                );

                const currentItem = existingStripeSubscription.items.data[0];
                if (!currentItem) {
                    throw new Error("Existing subscription has no subscription item to update");
                }

                const currentPriceId = currentItem.price?.id;
                const currentCouponId = subscriptionCouponId(existingStripeSubscription);
                const shouldSyncDiscount = currentCouponId !== discountCouponId;

                if (
                    currentPriceId === priceId &&
                    !existingStripeSubscription.cancel_at_period_end &&
                    !shouldSyncDiscount
                ) {
                    await upsertSubscriptionRecord(
                        supabase,
                        user.id,
                        stripeCustomerId,
                        existingStripeSubscription,
                        priceId,
                        planSnapshot.planName
                    );

                    if (["active", "trialing"].includes(existingStripeSubscription.status)) {
                        await supabase
                            .from("users")
                            .update({ membership_tier: planSnapshot.tier })
                            .eq("id", user.id);
                    }

                    return new Response(
                        JSON.stringify({
                            subscriptionId: existingStripeSubscription.id,
                            clientSecret: getPaymentIntentClientSecretFromSubscription(existingStripeSubscription),
                            xpLevel: xpDiscountContext.level,
                            xpDiscountPercent: xpDiscountContext.percent,
                            xpDiscountApplied: Boolean(discountCouponId),
                        }),
                        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                const updatedSubscription = currentPriceId === priceId
                    ? await stripe.subscriptions.update(
                        existingStripeSubscription.id,
                        {
                            cancel_at_period_end: false,
                            proration_behavior: "none",
                            discounts: targetDiscounts,
                            expand: ["latest_invoice.payment_intent"],
                        }
                    )
                    : await stripe.subscriptions.update(
                        existingStripeSubscription.id,
                        {
                            cancel_at_period_end: false,
                            payment_behavior: "default_incomplete",
                            payment_settings: { save_default_payment_method: "on_subscription" },
                            proration_behavior: "create_prorations",
                            discounts: targetDiscounts,
                            items: [
                                {
                                    id: currentItem.id,
                                    price: priceId,
                                },
                            ],
                            expand: ["latest_invoice.payment_intent"],
                        }
                    );

                await upsertSubscriptionRecord(
                    supabase,
                    user.id,
                    stripeCustomerId,
                    updatedSubscription,
                    priceId,
                    planSnapshot.planName
                );

                if (["active", "trialing"].includes(updatedSubscription.status)) {
                    await supabase
                        .from("users")
                        .update({ membership_tier: planSnapshot.tier })
                        .eq("id", user.id);
                }

                return new Response(
                    JSON.stringify({
                        subscriptionId: updatedSubscription.id,
                        clientSecret: getPaymentIntentClientSecretFromSubscription(updatedSubscription),
                        xpLevel: xpDiscountContext.level,
                        xpDiscountPercent: xpDiscountContext.percent,
                        xpDiscountApplied: Boolean(discountCouponId),
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            } catch (manageError) {
                console.warn(
                    "[stripe-create-subscription] Existing subscription update failed; creating a new subscription:",
                    manageError
                );
            }
        }

        // Create a new subscription only when no manageable existing subscription was found.
        console.log("[stripe-create-subscription] Creating subscription with priceId:", priceId);
        const subscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: priceId }],
            payment_behavior: "default_incomplete",
            payment_settings: { save_default_payment_method: "on_subscription" },
            discounts: targetDiscounts,
            expand: ["latest_invoice.payment_intent"],
        });
        console.log("[stripe-create-subscription] Subscription created:", subscription.id, "status:", subscription.status);

        await upsertSubscriptionRecord(
            supabase,
            user.id,
            stripeCustomerId,
            subscription,
            priceId,
            planSnapshot.planName
        );

        if (["active", "trialing"].includes(subscription.status)) {
            const { error: tierUpdateError } = await supabase
                .from("users")
                .update({ membership_tier: planSnapshot.tier })
                .eq("id", user.id);
            if (tierUpdateError) {
                console.warn("[stripe-create-subscription] Failed to sync user tier:", tierUpdateError);
            }
        }

        return new Response(
            JSON.stringify({
                subscriptionId: subscription.id,
                clientSecret: getPaymentIntentClientSecretFromSubscription(subscription),
                xpLevel: xpDiscountContext.level,
                xpDiscountPercent: xpDiscountContext.percent,
                xpDiscountApplied: Boolean(discountCouponId),
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
