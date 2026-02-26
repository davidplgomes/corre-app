-- =====================================================
-- PRODUCTION READINESS MIGRATION
-- Fixes critical issues identified in production audit
-- Execute this in Supabase Dashboard > SQL Editor
-- =====================================================

-- =====================================================
-- 1. ORDERS TABLE - Add missing columns
-- The stripe-webhook writes failure_reason but column doesn't exist
-- =====================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Add UPDATE policy for orders (users need to update shipping, etc.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'orders'
        AND policyname = 'Users can update own orders'
    ) THEN
        CREATE POLICY "Users can update own orders" ON public.orders
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END
$$;

-- =====================================================
-- 2. USERS TABLE - Add push_token column
-- savePushToken() function was calling update with no fields
-- =====================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Index for finding users by push token (useful for broadcast notifications)
CREATE INDEX IF NOT EXISTS idx_users_push_token ON public.users(push_token) WHERE push_token IS NOT NULL;

-- =====================================================
-- 3. Additional RLS policies verification
-- Ensure all user-owned tables have proper policies
-- =====================================================

-- Verify strava_connections has DELETE policy (for disconnection)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'strava_connections'
        AND policyname = 'Users can delete own strava connection'
    ) THEN
        CREATE POLICY "Users can delete own strava connection" ON public.strava_connections
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN public.orders.failure_reason IS 'Reason for payment failure from Stripe webhook';
COMMENT ON COLUMN public.orders.paid_at IS 'Timestamp when payment was confirmed via Stripe webhook';
COMMENT ON COLUMN public.orders.customer_email IS 'Customer email for order notifications and receipts';
COMMENT ON COLUMN public.users.push_token IS 'Expo push notification token for the user device';
