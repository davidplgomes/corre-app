import { NextResponse } from 'next/server';
import { ensureAdmin, getServiceClient, logAdminAction } from '../_utils';

export const runtime = 'nodejs';

const MANAGEABLE_STATUSES = new Set(['processing', 'ready_for_pickup', 'picked_up', 'cancelled', 'disputed']);

function normalizeStatus(status: string): string {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'canceled') return 'cancelled';
    if (normalized === 'shipped') return 'ready_for_pickup';
    if (normalized === 'delivered') return 'picked_up';
    return normalized;
}

export async function POST(request: Request) {
    try {
        const adminCheck = await ensureAdmin();
        if (!adminCheck.ok) {
            return adminCheck.response;
        }

        const body = await request.json() as { orderId?: string; status?: string };
        const orderId = (body.orderId || '').trim();
        const nextStatus = normalizeStatus(body.status || '');

        if (!orderId) {
            return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
        }

        if (!MANAGEABLE_STATUSES.has(nextStatus)) {
            return NextResponse.json({ error: 'Invalid status transition target' }, { status: 400 });
        }

        const adminClient = getServiceClient();
        const { data: existingOrder, error: existingOrderError } = await adminClient
            .from('orders')
            .select('id, status')
            .eq('id', orderId)
            .maybeSingle();

        if (existingOrderError) {
            return NextResponse.json({ error: existingOrderError.message }, { status: 500 });
        }

        if (!existingOrder) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const currentStatus = normalizeStatus(String(existingOrder.status || ''));
        if (currentStatus === 'refunded') {
            return NextResponse.json(
                { error: 'Cannot change status of a refunded order' },
                { status: 400 }
            );
        }

        if (currentStatus === 'picked_up' && nextStatus !== 'disputed') {
            return NextResponse.json(
                { error: 'Picked up orders can only transition to disputed manually.' },
                { status: 400 }
            );
        }

        if (currentStatus === 'payment_failed') {
            return NextResponse.json(
                { error: 'Cannot manually transition failed orders. Retry payment instead.' },
                { status: 400 }
            );
        }

        const { error: updateError } = await adminClient
            .from('orders')
            .update({
                status: nextStatus,
                updated_at: new Date().toISOString(),
            })
            .eq('id', orderId);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        await logAdminAction(
            adminClient,
            adminCheck.context.userId,
            'order.status_updated',
            {
                order_id: orderId,
                previous_status: existingOrder.status,
                next_status: nextStatus,
            }
        );

        return NextResponse.json({
            success: true,
            orderId,
            status: nextStatus,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
