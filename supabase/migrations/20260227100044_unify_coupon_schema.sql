-- =====================================================
-- Sprint 1: Unify partner_coupons schema
-- The mobile app and web dashboard were using incompatible
-- column names for the same table. This migration adds the
-- missing columns and creates a compatibility view so both
-- sides read/write the same data.
-- =====================================================

-- ─── 1. Add missing columns to partner_coupons ────────────

-- Legacy-to-unified compatibility columns (old web schema → new shared schema)
ALTER TABLE public.partner_coupons
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.partner_coupons
ADD COLUMN IF NOT EXISTS stock_limit INTEGER;

ALTER TABLE public.partner_coupons
ADD COLUMN IF NOT EXISTS redeemed_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.partner_coupons
ADD COLUMN IF NOT EXISTS discount_type TEXT
    CHECK (discount_type IN ('percentage', 'fixed', 'freebie'));

ALTER TABLE public.partner_coupons
ADD COLUMN IF NOT EXISTS discount_value NUMERIC;

-- Backfill from legacy columns when present.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='partner_coupons' AND column_name='valid_until'
    ) THEN
        EXECUTE 'UPDATE public.partner_coupons SET expires_at = COALESCE(expires_at, valid_until)';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='partner_coupons' AND column_name='max_uses'
    ) THEN
        EXECUTE 'UPDATE public.partner_coupons SET stock_limit = COALESCE(stock_limit, max_uses)';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='partner_coupons' AND column_name='current_uses'
    ) THEN
        EXECUTE 'UPDATE public.partner_coupons SET redeemed_count = COALESCE(redeemed_count, current_uses, 0)';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='partner_coupons' AND column_name='discount_percent'
    ) THEN
        EXECUTE '
            UPDATE public.partner_coupons
            SET
                discount_type = COALESCE(discount_type, ''percentage''),
                discount_value = COALESCE(discount_value, discount_percent)
            WHERE discount_percent IS NOT NULL
        ';
    END IF;
END $$;

-- partner_id: links a coupon to the partner who created it (web needs this)
ALTER TABLE public.partner_coupons
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- min_tier: minimum membership tier required to redeem (web uses this for targeting)
ALTER TABLE public.partner_coupons
ADD COLUMN IF NOT EXISTS min_tier TEXT DEFAULT 'free'
    CHECK (min_tier IN ('free', 'pro', 'club', 'basico', 'baixa_pace', 'parceiros'));

-- valid_from: when the coupon becomes valid (web sends this)
ALTER TABLE public.partner_coupons
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_partner_coupons_partner ON public.partner_coupons(partner_id)
    WHERE partner_id IS NOT NULL;

COMMENT ON COLUMN public.partner_coupons.partner_id IS
    'UUID of the partner user who owns this coupon. NULL = Corre admin-created coupon.';
COMMENT ON COLUMN public.partner_coupons.min_tier IS
    'Minimum membership tier required to redeem. Defaults to free (all users).';
COMMENT ON COLUMN public.partner_coupons.valid_from IS
    'When the coupon becomes redeemable. Defaults to creation time.';

-- ─── 2. Update RLS to allow partners to manage own coupons ─

-- Drop the old catch-all "anyone can view active coupons" policy and replace
-- it with a more complete set that includes partner write access.

DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.partner_coupons;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_coupons' AND policyname='Anyone can view active coupons') THEN
        CREATE POLICY "Anyone can view active coupons" ON public.partner_coupons FOR SELECT
            USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_coupons' AND policyname='Admins can view all coupons') THEN
        CREATE POLICY "Admins can view all coupons" ON public.partner_coupons FOR SELECT
            USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_coupons' AND policyname='Partners can view own coupons') THEN
        CREATE POLICY "Partners can view own coupons" ON public.partner_coupons FOR SELECT
            USING (partner_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_coupons' AND policyname='Partners can create own coupons') THEN
        CREATE POLICY "Partners can create own coupons" ON public.partner_coupons FOR INSERT
            WITH CHECK (partner_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_coupons' AND policyname='Partners can update own coupons') THEN
        CREATE POLICY "Partners can update own coupons" ON public.partner_coupons FOR UPDATE
            USING (partner_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_coupons' AND policyname='Partners can delete own coupons') THEN
        CREATE POLICY "Partners can delete own coupons" ON public.partner_coupons FOR DELETE
            USING (partner_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_coupons' AND policyname='Admins can manage all coupons') THEN
        CREATE POLICY "Admins can manage all coupons" ON public.partner_coupons FOR ALL
            USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_coupons' AND policyname='Service role full access on coupons') THEN
        CREATE POLICY "Service role full access on coupons" ON public.partner_coupons FOR ALL
            USING (auth.role() = 'service_role');
    END IF;
END $$;

-- ─── 3. Create coupon_redemptions view ────────────────────
-- The web dashboard queries `coupon_redemptions` but the mobile
-- migration created the table as `user_coupon_redemptions`.
-- This view bridges both so neither side needs to change its queries.

-- Ensure user_coupon_redemptions exists (may be absent if live DB was created differently)
CREATE TABLE IF NOT EXISTS public.user_coupon_redemptions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    coupon_id    UUID NOT NULL REFERENCES public.partner_coupons(id) ON DELETE CASCADE,
    code_used    TEXT NOT NULL,
    points_spent INTEGER NOT NULL,
    redeemed_at  TIMESTAMPTZ DEFAULT NOW(),
    is_used      BOOLEAN DEFAULT false,
    used_at      TIMESTAMPTZ,
    UNIQUE(user_id, coupon_id, redeemed_at)
);

ALTER TABLE public.user_coupon_redemptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_coupon_redemptions' AND policyname='Users can view own redemptions') THEN
        CREATE POLICY "Users can view own redemptions" ON public.user_coupon_redemptions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_coupon_redemptions' AND policyname='Users can insert own redemptions') THEN
        CREATE POLICY "Users can insert own redemptions" ON public.user_coupon_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Only create the view if coupon_redemptions doesn't already exist as a BASE TABLE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'coupon_redemptions'
          AND table_type = 'BASE TABLE'
    ) THEN
        EXECUTE $view$
            CREATE OR REPLACE VIEW public.coupon_redemptions AS
                SELECT id, coupon_id, user_id, code_used, points_spent, redeemed_at, is_used, used_at
                FROM public.user_coupon_redemptions
        $view$;
    END IF;
END $$;

-- ─── 4. RLS on user_coupon_redemptions – add admin/partner read ───

-- Admins need to see all redemptions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_coupon_redemptions'
          AND policyname = 'Admins can view all redemptions'
    ) THEN
        CREATE POLICY "Admins can view all redemptions"
            ON public.user_coupon_redemptions FOR SELECT
            USING (
                EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
            );
    END IF;
END $$;

-- Partners need to see redemptions of their own coupons
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_coupon_redemptions'
          AND policyname = 'Partners can view redemptions of own coupons'
    ) THEN
        CREATE POLICY "Partners can view redemptions of own coupons"
            ON public.user_coupon_redemptions FOR SELECT
            USING (
                coupon_id IN (
                    SELECT id FROM public.partner_coupons WHERE partner_id = auth.uid()
                )
            );
    END IF;
END $$;
