import { NextResponse } from 'next/server';
import { ensureAdmin, getServiceClient } from './_utils';

export const runtime = 'nodejs';

type OrderRow = {
    id: string;
    user_id: string | null;
    total_amount: number | null;
    points_used: number | null;
    cash_amount: number | null;
    status: string;
    stripe_payment_intent_id: string | null;
    shipping_address: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    paid_at: string | null;
    failure_reason: string | null;
    points_consumed_at: string | null;
    points_refunded_at: string | null;
};

type OrderItemRow = {
    id: string;
    order_id: string;
    item_type: 'shop' | 'marketplace';
    item_id: string;
    quantity: number;
    unit_price: number;
};

function normalizeStatus(status: string): string {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'canceled') return 'cancelled';
    if (normalized === 'shipped') return 'ready_for_pickup';
    if (normalized === 'delivered') return 'picked_up';
    return normalized;
}

export async function GET() {
    try {
        const adminCheck = await ensureAdmin();
        if (!adminCheck.ok) {
            return adminCheck.response;
        }

        const adminClient = getServiceClient();

        const { data: ordersData, error: ordersError } = await adminClient
            .from('orders')
            .select(
                'id, user_id, total_amount, points_used, cash_amount, status, stripe_payment_intent_id, shipping_address, created_at, updated_at, paid_at, failure_reason, points_consumed_at, points_refunded_at'
            )
            .order('created_at', { ascending: false })
            .limit(500);

        if (ordersError) {
            return NextResponse.json({ error: ordersError.message }, { status: 500 });
        }

        const orders = (ordersData || []) as OrderRow[];
        const orderIds = orders.map((order) => order.id);
        const userIds = [...new Set(orders.map((order) => order.user_id).filter(Boolean))] as string[];

        const [orderItemsRes, usersRes] = await Promise.all([
            orderIds.length > 0
                ? adminClient
                    .from('order_items')
                    .select('id, order_id, item_type, item_id, quantity, unit_price')
                    .in('order_id', orderIds)
                : Promise.resolve({ data: [], error: null }),
            userIds.length > 0
                ? adminClient
                    .from('users')
                    .select('id, full_name, email, membership_tier')
                    .in('id', userIds)
                : Promise.resolve({ data: [], error: null }),
        ]);

        if (orderItemsRes.error) {
            return NextResponse.json({ error: orderItemsRes.error.message }, { status: 500 });
        }

        if (usersRes.error) {
            return NextResponse.json({ error: usersRes.error.message }, { status: 500 });
        }

        const orderItems = (orderItemsRes.data || []) as OrderItemRow[];
        const usersById = new Map(
            (usersRes.data || []).map((user: any) => [user.id, user])
        );

        const shopItemIds = [...new Set(
            orderItems
                .filter((item) => item.item_type === 'shop')
                .map((item) => item.item_id)
        )];
        const marketplaceItemIds = [...new Set(
            orderItems
                .filter((item) => item.item_type === 'marketplace')
                .map((item) => item.item_id)
        )];

        const [shopItemsRes, marketplaceItemsRes] = await Promise.all([
            shopItemIds.length > 0
                ? adminClient
                    .from('corre_shop_items')
                    .select('id, title')
                    .in('id', shopItemIds)
                : Promise.resolve({ data: [], error: null }),
            marketplaceItemIds.length > 0
                ? adminClient
                    .from('marketplace_listings')
                    .select('id, title')
                    .in('id', marketplaceItemIds)
                : Promise.resolve({ data: [], error: null }),
        ]);

        if (shopItemsRes.error) {
            return NextResponse.json({ error: shopItemsRes.error.message }, { status: 500 });
        }
        if (marketplaceItemsRes.error) {
            return NextResponse.json({ error: marketplaceItemsRes.error.message }, { status: 500 });
        }

        const shopTitlesById = new Map((shopItemsRes.data || []).map((item: any) => [item.id, item.title]));
        const marketplaceTitlesById = new Map((marketplaceItemsRes.data || []).map((item: any) => [item.id, item.title]));

        const itemsByOrderId = new Map<string, Array<OrderItemRow & { title: string }>>();
        for (const item of orderItems) {
            const list = itemsByOrderId.get(item.order_id) || [];
            list.push({
                ...item,
                title: item.item_type === 'shop'
                    ? (shopTitlesById.get(item.item_id) || 'Shop item')
                    : (marketplaceTitlesById.get(item.item_id) || 'Marketplace item'),
            });
            itemsByOrderId.set(item.order_id, list);
        }

        const normalizedStatuses = orders.map((order) => normalizeStatus(String(order.status || '')));

        const summary = {
            total: orders.length,
            pending: normalizedStatuses.filter((status) => status === 'pending').length,
            paid: normalizedStatuses.filter((status) => status === 'paid').length,
            processing: normalizedStatuses.filter((status) => status === 'processing').length,
            ready_for_pickup: normalizedStatuses.filter((status) => status === 'ready_for_pickup').length,
            picked_up: normalizedStatuses.filter((status) => status === 'picked_up').length,
            payment_failed: normalizedStatuses.filter((status) => status === 'payment_failed').length,
            refunded: normalizedStatuses.filter((status) => status === 'refunded').length,
            disputed: normalizedStatuses.filter((status) => status === 'disputed').length,
            cancelled: normalizedStatuses.filter((status) => status === 'cancelled').length,
        };

        const mappedOrders = orders.map((order) => ({
            ...order,
            status: normalizeStatus(String(order.status || '')),
            user: order.user_id ? (usersById.get(order.user_id) || null) : null,
            items: itemsByOrderId.get(order.id) || [],
        }));

        return NextResponse.json({
            orders: mappedOrders,
            summary,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
