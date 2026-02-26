-- =====================================================
-- FIX ORDERS TABLE FOR STRIPE WEBHOOK COMPATIBILITY
-- Adds missing columns and statuses needed by payment webhooks
-- =====================================================

-- Add missing columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT;

COMMENT ON COLUMN public.orders.paid_at IS 'Timestamp when payment was confirmed via Stripe webhook';
COMMENT ON COLUMN public.orders.failure_reason IS 'Reason for payment failure from Stripe';
COMMENT ON COLUMN public.orders.customer_email IS 'Customer email for receipts';

-- Drop and recreate status constraint to include all webhook statuses
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'payment_failed', 'refunded', 'disputed'));

-- Update membership_tier constraint to include all tier options
-- First drop the old constraint, then add the new one
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_membership_tier_check;
ALTER TABLE public.users ADD CONSTRAINT users_membership_tier_check
    CHECK (membership_tier IN ('free', 'basico', 'baixa_pace', 'parceiros', 'pro', 'club'));

COMMENT ON COLUMN public.users.membership_tier IS 'User subscription tier - synced from Stripe subscription status';

-- Add push_token to users table for push notifications
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS push_token TEXT;

COMMENT ON COLUMN public.users.push_token IS 'Expo push notification token';

-- Create index for faster subscription lookups by customer
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer
    ON public.subscriptions(stripe_customer_id);

-- =====================================================
-- RLS POLICIES FOR PAYMENT-RELATED TABLES
-- =====================================================

-- Orders RLS (users can only see their own orders)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders"
    ON public.orders FOR UPDATE
    USING (auth.uid() = user_id);

-- Cart Items RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart_items;
CREATE POLICY "Users can manage own cart"
    ON public.cart_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Point Transactions RLS
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own points" ON public.point_transactions;
CREATE POLICY "Users can view own points"
    ON public.point_transactions FOR SELECT
    USING (auth.uid() = user_id);
