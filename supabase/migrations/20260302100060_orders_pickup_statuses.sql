-- =====================================================
-- LOCAL PICKUP ORDER STATUSES
-- Normalizes shop order fulfillment from shipping to pickup.
-- =====================================================

-- Backfill legacy shipping statuses into pickup semantics.
UPDATE public.orders
SET status = 'ready_for_pickup'
WHERE status = 'shipped';

UPDATE public.orders
SET status = 'picked_up'
WHERE status = 'delivered';

-- Extend constraint with pickup statuses (and keep legacy aliases for compatibility).
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
        'shipped',
        'delivered',
        'cancelled',
        'payment_failed',
        'refunded',
        'disputed'
    )
);
