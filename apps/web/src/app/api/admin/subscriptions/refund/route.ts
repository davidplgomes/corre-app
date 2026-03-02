import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

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

type RefundResponse = {
    id: string;
    status?: string;
    amount?: number;
    payment_intent?: string | null;
};

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

        const body = await request.json() as { subscriptionId?: string };
        const subscriptionId = (body.subscriptionId || '').trim();
        if (!subscriptionId) {
            return NextResponse.json({ error: 'subscriptionId is required' }, { status: 400 });
        }

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
        }

        const adminClient = getServiceClient();
        const { data: subscription, error: subError } = await adminClient
            .from('subscriptions')
            .select('id, user_id, stripe_subscription_id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();

        if (subError) {
            return NextResponse.json({ error: subError.message }, { status: 500 });
        }
        if (!subscription) {
            return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        const { data: latestTxn, error: txnError } = await adminClient
            .from('transactions')
            .select('id, user_id, amount, currency, status, stripe_payment_intent_id, description, metadata')
            .eq('subscription_id', subscription.id)
            .not('stripe_payment_intent_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (txnError) {
            return NextResponse.json({ error: txnError.message }, { status: 500 });
        }

        if (!latestTxn) {
            return NextResponse.json(
                { error: 'No Stripe payment found for this subscription to refund.' },
                { status: 404 }
            );
        }

        if (latestTxn.status === 'refunded') {
            await logAdminAction(
                adminClient,
                user.id,
                'subscription.refund',
                {
                    subscription_id: subscriptionId,
                    transaction_id: latestTxn.id,
                    already_refunded: true,
                }
            );
            return NextResponse.json({
                success: true,
                alreadyRefunded: true,
                transactionId: latestTxn.id,
            });
        }

        if (latestTxn.status !== 'succeeded') {
            return NextResponse.json(
                { error: `Latest transaction is not refundable (status: ${latestTxn.status}).` },
                { status: 400 }
            );
        }

        if (!latestTxn.stripe_payment_intent_id) {
            return NextResponse.json(
                { error: 'Latest transaction has no Stripe payment intent id.' },
                { status: 400 }
            );
        }

        const params = new URLSearchParams();
        params.set('payment_intent', latestTxn.stripe_payment_intent_id);
        params.set('reason', 'requested_by_customer');

        const stripeRes = await fetch('https://api.stripe.com/v1/refunds', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        if (!stripeRes.ok) {
            const text = await stripeRes.text();
            return NextResponse.json(
                { error: 'Stripe request failed', details: text },
                { status: 502 }
            );
        }

        const stripeRefund = await stripeRes.json() as RefundResponse;
        if (!stripeRefund.id) {
            return NextResponse.json(
                { error: 'Stripe refund response missing id.' },
                { status: 502 }
            );
        }

        if (stripeRefund.status && stripeRefund.status !== 'succeeded' && stripeRefund.status !== 'pending') {
            return NextResponse.json(
                { error: `Stripe refund failed with status: ${stripeRefund.status}` },
                { status: 502 }
            );
        }

        const mergedMetadata = {
            ...(typeof latestTxn.metadata === 'object' && latestTxn.metadata ? latestTxn.metadata : {}),
            stripe_refund_id: stripeRefund.id,
            refunded_at: new Date().toISOString(),
            refunded_by_admin_id: user.id,
        };

        const { error: updateTxnError } = await adminClient
            .from('transactions')
            .update({
                status: 'refunded',
                description: latestTxn.description
                    ? `${latestTxn.description} (refunded)`
                    : 'Subscription charge refunded',
                metadata: mergedMetadata,
            })
            .eq('id', latestTxn.id);

        if (updateTxnError) {
            return NextResponse.json({ error: updateTxnError.message }, { status: 500 });
        }

        await logAdminAction(
            adminClient,
            user.id,
            'subscription.refund',
            {
                subscription_id: subscriptionId,
                transaction_id: latestTxn.id,
                stripe_refund_id: stripeRefund.id,
                amount: stripeRefund.amount ?? latestTxn.amount,
                currency: latestTxn.currency,
            }
        );

        return NextResponse.json({
            success: true,
            transactionId: latestTxn.id,
            stripeRefundId: stripeRefund.id,
            amount: stripeRefund.amount ?? latestTxn.amount,
            currency: latestTxn.currency,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
