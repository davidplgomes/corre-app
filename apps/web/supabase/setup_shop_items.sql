-- =====================================================
-- DEPRECATED LEGACY SCRIPT (CANONICALIZED)
-- This script now targets public.corre_shop_items only.
-- Do not create/use public.shop_items.
-- =====================================================

-- Ensure canonical shop table exists with required columns.
CREATE TABLE IF NOT EXISTS public.corre_shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    points_price INTEGER NOT NULL DEFAULT 1000,
    image_url TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.corre_shop_items
    ADD COLUMN IF NOT EXISTS price_cents INTEGER,
    ADD COLUMN IF NOT EXISTS allow_points_discount BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS max_points_discount_percent INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill canonical price when missing.
UPDATE public.corre_shop_items
SET price_cents = COALESCE(price_cents, points_price, 0)
WHERE price_cents IS NULL;

ALTER TABLE public.corre_shop_items ENABLE ROW LEVEL SECURITY;

-- Public read for active shop catalog.
DROP POLICY IF EXISTS "Anyone can read shop items" ON public.corre_shop_items;
CREATE POLICY "Anyone can read shop items"
    ON public.corre_shop_items
    FOR SELECT
    USING (true);

-- Admin full access.
DROP POLICY IF EXISTS "Admins can manage shop items" ON public.corre_shop_items;
CREATE POLICY "Admins can manage shop items"
    ON public.corre_shop_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role = 'admin'
        )
    );
