-- =====================================================
-- ADD MISSING COLUMNS TO marketplace_orders
-- Adds paid_at, failure_reason, and expands status enum
-- =====================================================

-- Add missing columns
ALTER TABLE public.marketplace_orders
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Drop old check constraint and add expanded one
-- The old constraint only allowed: pending, paid, shipped, completed, cancelled, refunded
ALTER TABLE public.marketplace_orders DROP CONSTRAINT IF EXISTS marketplace_orders_status_check;
ALTER TABLE public.marketplace_orders ADD CONSTRAINT marketplace_orders_status_check
    CHECK (status IN ('pending', 'paid', 'shipped', 'completed', 'cancelled', 'refunded', 'payment_failed', 'disputed'));

-- Allow webhook service role to update marketplace_orders
CREATE POLICY "Service role can update marketplace orders" ON public.marketplace_orders
    FOR UPDATE USING (true) WITH CHECK (true);

-- Allow webhook service role to update marketplace_listings status to 'sold'
-- (The existing update policy only allows seller_id = auth.uid(), but the webhook
-- runs as service role via SUPABASE_SERVICE_ROLE_KEY, so this is already covered.)
