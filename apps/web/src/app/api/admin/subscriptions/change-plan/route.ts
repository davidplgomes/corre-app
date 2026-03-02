import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

type MembershipTier = 'free' | 'pro' | 'club';

type StripeSubscriptionResponse = {
    id?: string;
    status?: string;
    cancel_at_period_end?: boolean;
    current_period_start?: number;
    current_period_end?: number;
    items?: {
        data?: Array<{
            id?: string;
            price?: { id?: string | null } | null;
        }>;
    };
};

type StripePriceResponse = {
    id?: string;
    nickname?: string | null;
    metadata?: Record<string, string>;
    product?: {
        name?: string | null;
        metadata?: Record<string, string>;
    } | string | null;
};

function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase service configuration');
    }
    return createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

const normalizeTier = (value: string | null | undefined): MembershipTier | null => {
    if (!value) return null;
    const normalized = value.toLowerCase().trim();
    if (['club', 'premium', 'elite'].includes(normalized)) return 'club';
    if (['pro', 'plus', 'monthly', 'annual', 'yearly', 'anual'].includes(normalized)) return 'pro';
    if (normalized === 'free') return 'free';
    return null;
};

const inferTierFromText = (value: string | null | undefined): MembershipTier | null => {
    if (!value) return null;
    const normalized = value.toLowerCase();
    if (normalized.includes('club') || normalized.includes('premium')) return 'club';
    if (normalized.includes('pro')) return 'pro';
    return null;
};

async function logAdminAction(
    adminClient: any,
    actorId: string,
    action: string,
    details: Record<string, unknown>
) {
    const { error } = await adminClient
        .from('admin_action_logs' as any)
        .insert({
            actor_id: actorId,
            action,
            details,
        } as any);

    if (error) {
        console.warn('Failed to write admin action log:', error.message);
    }
}

async function getPlanSnapshot(stripeSecretKey: string, priceId: string): Promise<{ planName: string; tier: MembershipTier }> {
    const params = new URLSearchParams();
    params.append('expand[]', 'product');

    const stripeRes = await fetch(
        `https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}?${params.toString()}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${stripeSecretKey}`,
            },
        }
    );

    if (!stripeRes.ok) {
        const text = await stripeRes.text();
        throw new Error(`Failed to resolve Stripe price: ${text}`);
    }

    const price = await stripeRes.json() as StripePriceResponse;
    const product = price.product && typeof price.product !== 'string' ? price.product : null;

    const metadataTier =
        normalizeTier(price.metadata?.membership_tier) ||
        normalizeTier(price.metadata?.tier) ||
        normalizeTier(product?.metadata?.membership_tier) ||
        normalizeTier(product?.metadata?.tier);

    const inferredTier =
        inferTierFromText(price.nickname || null) ||
        inferTierFromText(product?.name || null) ||
        inferTierFromText(price.id || null);

    return {
        planName: product?.name || price.nickname || 'Pro',
        tier: metadataTier || inferredTier || 'pro',
    };
}

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: actor, error: actorError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        if (actorError) {
            return NextResponse.json({ error: actorError.message }, { status: 500 });
        }

        if (!actor || actor.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json() as { subscriptionId?: string; priceId?: string };
        const subscriptionId = (body.subscriptionId || '').trim();
        const priceId = (body.priceId || '').trim();

        if (!subscriptionId) {
            return NextResponse.json({ error: 'subscriptionId is required' }, { status: 400 });
        }
        if (!priceId) {
            return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
        }

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
        }

        const adminClient = getServiceClient();

        const { data: sub, error: subError } = await adminClient
            .from('subscriptions')
            .select('id, user_id, plan_id, status, cancel_at_period_end, stripe_subscription_id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();

        if (subError) {
            return NextResponse.json({ error: subError.message }, { status: 500 });
        }
        if (!sub) {
            return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        const stripeSubRes = await fetch(
            `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${stripeSecretKey}`,
                },
            }
        );

        if (!stripeSubRes.ok) {
            const text = await stripeSubRes.text();
            return NextResponse.json(
                { error: 'Stripe subscription lookup failed', details: text },
                { status: 502 }
            );
        }

        const stripeSub = await stripeSubRes.json() as StripeSubscriptionResponse;
        const currentItem = stripeSub.items?.data?.[0];
        const currentItemId = currentItem?.id;
        const currentPriceId = currentItem?.price?.id || null;

        if (!currentItemId) {
            return NextResponse.json(
                { error: 'Stripe subscription item not found for this subscription.' },
                { status: 502 }
            );
        }

        const planSnapshot = await getPlanSnapshot(stripeSecretKey, priceId);
        const alreadyOnPlan =
            currentPriceId === priceId &&
            stripeSub.cancel_at_period_end !== true;

        if (alreadyOnPlan) {
            await logAdminAction(
                adminClient,
                user.id,
                'subscription.plan_changed',
                {
                    subscription_id: subscriptionId,
                    previous_plan_id: sub.plan_id,
                    next_plan_id: priceId,
                    already_on_plan: true,
                    status: sub.status,
                }
            );

            return NextResponse.json({
                success: true,
                alreadyOnPlan: true,
                status: sub.status,
                cancel_at_period_end: sub.cancel_at_period_end,
                plan_id: priceId,
                plan_name: planSnapshot.planName,
            });
        }

        const params = new URLSearchParams();
        params.set('cancel_at_period_end', 'false');
        params.set('payment_behavior', 'default_incomplete');
        params.set('proration_behavior', 'create_prorations');
        params.set('items[0][id]', currentItemId);
        params.set('items[0][price]', priceId);
        params.append('expand[]', 'latest_invoice.payment_intent');

        const stripeUpdateRes = await fetch(
            `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${stripeSecretKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            }
        );

        if (!stripeUpdateRes.ok) {
            const text = await stripeUpdateRes.text();
            return NextResponse.json(
                { error: 'Stripe request failed', details: text },
                { status: 502 }
            );
        }

        const updatedSub = await stripeUpdateRes.json() as StripeSubscriptionResponse;
        const nextStatus = updatedSub.status || sub.status;
        const nextCancelAtPeriodEnd = updatedSub.cancel_at_period_end ?? false;

        const updatePayload: Record<string, string | boolean> = {
            plan_id: priceId,
            plan_name: planSnapshot.planName,
            status: nextStatus,
            cancel_at_period_end: nextCancelAtPeriodEnd,
            updated_at: new Date().toISOString(),
        };

        if (typeof updatedSub.current_period_start === 'number') {
            updatePayload.current_period_start = new Date(updatedSub.current_period_start * 1000).toISOString();
        }
        if (typeof updatedSub.current_period_end === 'number') {
            updatePayload.current_period_end = new Date(updatedSub.current_period_end * 1000).toISOString();
        }

        const { error: updateError } = await adminClient
            .from('subscriptions')
            .update(updatePayload)
            .eq('stripe_subscription_id', subscriptionId);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        let updatedUserTier: MembershipTier | null = null;
        if (nextStatus === 'active' || nextStatus === 'trialing') {
            updatedUserTier = planSnapshot.tier;
            const { error: userTierError } = await adminClient
                .from('users')
                .update({ membership_tier: updatedUserTier })
                .eq('id', sub.user_id);

            if (userTierError) {
                console.warn('Failed to sync user tier after plan change:', userTierError.message);
            }
        }

        await logAdminAction(
            adminClient,
            user.id,
            'subscription.plan_changed',
            {
                subscription_id: subscriptionId,
                previous_plan_id: sub.plan_id,
                next_plan_id: priceId,
                status: nextStatus,
                cancel_at_period_end: nextCancelAtPeriodEnd,
                user_tier: updatedUserTier || undefined,
            }
        );

        return NextResponse.json({
            success: true,
            status: nextStatus,
            cancel_at_period_end: nextCancelAtPeriodEnd,
            plan_id: priceId,
            plan_name: planSnapshot.planName,
            user_tier: updatedUserTier,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
