-- Track points lifecycle on orders so checkout/webhook flows are idempotent.
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS points_consumed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS points_refunded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.points_consumed_at IS
  'When points were consumed for this order discount (set at checkout creation).';
COMMENT ON COLUMN public.orders.points_refunded_at IS
  'When consumed points were refunded due to payment failure/refund.';

CREATE INDEX IF NOT EXISTS idx_orders_points_refund_tracking
  ON public.orders(points_consumed_at, points_refunded_at)
  WHERE points_used > 0;
