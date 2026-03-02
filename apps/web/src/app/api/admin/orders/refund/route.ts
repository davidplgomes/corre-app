import { NextResponse } from 'next/server';
import { ensureAdmin, getServiceClient, logAdminAction } from '../_utils';

export const runtime = 'nodejs';

const REFUNDABLE_STATUSES = new Set(['paid', 'processing', 'ready_for_pickup', 'picked_up', 'disputed']);

function normalizeStatus(status: string): string {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'canceled') return 'cancelled';
    if (normalized === 'shipped') return 'ready_for_pickup';
    if (normalized === 'delivered') return 'picked_up';
    return normalized;
}

type StripeRefundResponse = {
    id: string;
    status?: string;
    amount?: number;
};

export async function POST(request: Request) {
    try {
        const adminCheck = await ensureAdmin();
        if (!adminCheck.ok) {
            return adminCheck.response;
        }

        const body = await request.json() as { orderId?: string };
        const orderId = (body.orderId || '').trim();

        if (!orderId) {
            return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
        }

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
        }

        const adminClient = getServiceClient();
        const { data: order, error: orderError } = await adminClient
            .from('orders')
            .select('id, user_id, status, stripe_payment_intent_id, points_used, points_consumed_at, points_refunded_at')
            .eq('id', orderId)
            .maybeSingle();

        if (orderError) {
            return NextResponse.json({ error: orderError.message }, { status: 500 });
        }

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const orderStatus = normalizeStatus(String(order.status || ''));

        if (orderStatus === 'refunded') {
            return NextResponse.json({
                success: true,
                alreadyRefunded: true,
                orderId: order.id,
            });
        }

        if (!REFUNDABLE_STATUSES.has(orderStatus)) {
            return NextResponse.json(
                { error: `Order in status "${order.status}" cannot be refunded.` },
                { status: 400 }
            );
        }

        if (!order.stripe_payment_intent_id) {
            return NextResponse.json(
                { error: 'Order has no Stripe payment intent id.' },
                { status: 400 }
            );
        }

        const params = new URLSearchParams();
        params.set('payment_intent', order.stripe_payment_intent_id);
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
                { error: 'Stripe refund request failed', details: text },
                { status: 502 }
            );
        }

        const stripeRefund = await stripeRes.json() as StripeRefundResponse;
        if (!stripeRefund.id) {
            return NextResponse.json({ error: 'Stripe refund response missing id' }, { status: 502 });
        }

        if (
            stripeRefund.status &&
            stripeRefund.status !== 'succeeded' &&
            stripeRefund.status !== 'pending'
        ) {
            return NextResponse.json(
                { error: `Stripe refund failed with status: ${stripeRefund.status}` },
                { status: 502 }
            );
        }

        let refundedPoints = false;
        const pointsUsed = Number(order.points_used || 0);

        if (pointsUsed > 0 && order.user_id && order.points_consumed_at && !order.points_refunded_at) {
            const { error: pointsRefundError } = await adminClient.rpc('add_points_with_ttl', {
                p_user_id: order.user_id,
                p_points: pointsUsed,
                p_source_type: 'purchase_refund',
                p_source_id: order.id,
                p_description: 'Refund: admin order refund',
            });

            if (!pointsRefundError) {
                refundedPoints = true;
            } else {
                console.warn('Failed to refund points during admin order refund:', pointsRefundError);
            }
        }

        const { error: updateError } = await adminClient
            .from('orders')
            .update({
                status: 'refunded',
                failure_reason: null,
                updated_at: new Date().toISOString(),
                ...(refundedPoints ? { points_refunded_at: new Date().toISOString() } : {}),
            })
            .eq('id', order.id);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        await logAdminAction(
            adminClient,
            adminCheck.context.userId,
            'order.refunded',
            {
                order_id: order.id,
                stripe_payment_intent_id: order.stripe_payment_intent_id,
                stripe_refund_id: stripeRefund.id,
                stripe_refund_status: stripeRefund.status || 'unknown',
                points_refunded: refundedPoints,
            }
        );

        return NextResponse.json({
            success: true,
            orderId: order.id,
            stripeRefundId: stripeRefund.id,
            refundedPoints,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
