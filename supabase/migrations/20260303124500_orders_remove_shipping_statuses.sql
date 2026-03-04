-- =====================================================
-- STRICT LOCAL PICKUP ORDER STATUSES
-- Removes shipping lifecycle aliases from orders.
-- =====================================================

-- Backfill any legacy aliases that might still exist.
UPDATE public.orders
SET status = 'ready_for_pickup'
WHERE status = 'shipped';

UPDATE public.orders
SET status = 'picked_up'
WHERE status = 'delivered';

-- Enforce pickup-only lifecycle statuses for shop orders.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check
CHECK (
    status IN (
        'pending',
        'paid',
        'processing',
        'ready_for_pickup',
        'picked_up',
        'cancelled',
        'payment_failed',
        'refunded',
        'disputed'
    )
);
