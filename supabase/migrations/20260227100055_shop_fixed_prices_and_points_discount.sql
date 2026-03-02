-- =====================================================
-- Shop pricing model sync
-- Fixed cash pricing (price_cents) + optional points discount
-- Backward-compatible with legacy points_price clients
-- =====================================================

ALTER TABLE public.corre_shop_items
    ADD COLUMN IF NOT EXISTS price_cents INTEGER,
    ADD COLUMN IF NOT EXISTS allow_points_discount BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS max_points_discount_percent INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill canonical price from legacy points_price.
-- Heuristic: legacy values below 1000 were entered as euro units (e.g. 120 => EUR 120.00).
UPDATE public.corre_shop_items
SET price_cents = CASE
    WHEN points_price IS NULL THEN NULL
    WHEN points_price < 1000 THEN points_price * 100
    ELSE points_price
END
WHERE price_cents IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'corre_shop_items_price_cents_non_negative'
    ) THEN
        ALTER TABLE public.corre_shop_items
            ADD CONSTRAINT corre_shop_items_price_cents_non_negative
            CHECK (price_cents IS NULL OR price_cents >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'corre_shop_items_max_points_discount_percent_check'
    ) THEN
        ALTER TABLE public.corre_shop_items
            ADD CONSTRAINT corre_shop_items_max_points_discount_percent_check
            CHECK (max_points_discount_percent BETWEEN 0 AND 100);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_corre_shop_items_active
    ON public.corre_shop_items(is_active)
    WHERE is_active = true;

COMMENT ON COLUMN public.corre_shop_items.price_cents IS
    'Canonical product price in cents (EUR).';

COMMENT ON COLUMN public.corre_shop_items.allow_points_discount IS
    'Whether points can be applied as discount to this item.';

COMMENT ON COLUMN public.corre_shop_items.max_points_discount_percent IS
    'Max percentage of item price that can be discounted with points.';

CREATE OR REPLACE FUNCTION public.sync_corre_shop_items_pricing()
RETURNS TRIGGER AS $$
BEGIN
    -- Legacy update support: if only points_price changed, derive canonical price_cents.
    IF TG_OP = 'UPDATE'
       AND NEW.price_cents IS NOT DISTINCT FROM OLD.price_cents
       AND NEW.points_price IS DISTINCT FROM OLD.points_price
       AND NEW.points_price IS NOT NULL THEN
        NEW.price_cents := CASE
            WHEN NEW.points_price < 1000 THEN NEW.points_price * 100
            ELSE NEW.points_price
        END;
    END IF;

    -- Legacy input support: if only points_price is provided, derive price_cents.
    IF NEW.price_cents IS NULL AND NEW.points_price IS NOT NULL THEN
        NEW.price_cents := CASE
            WHEN NEW.points_price < 1000 THEN NEW.points_price * 100
            ELSE NEW.points_price
        END;
    END IF;

    -- Keep legacy column in sync for older clients still reading points_price.
    IF NEW.price_cents IS NOT NULL THEN
        NEW.points_price := NEW.price_cents;
    END IF;

    NEW.max_points_discount_percent := GREATEST(0, LEAST(COALESCE(NEW.max_points_discount_percent, 20), 100));
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_sync_corre_shop_items_pricing'
    ) THEN
        CREATE TRIGGER trg_sync_corre_shop_items_pricing
            BEFORE INSERT OR UPDATE ON public.corre_shop_items
            FOR EACH ROW
            EXECUTE FUNCTION public.sync_corre_shop_items_pricing();
    END IF;
END $$;

ALTER TABLE public.corre_shop_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'corre_shop_items'
          AND policyname = 'Admins can manage shop items'
    ) THEN
        CREATE POLICY "Admins can manage shop items"
            ON public.corre_shop_items
            FOR ALL
            USING (public.is_current_user_admin())
            WITH CHECK (public.is_current_user_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'corre_shop_items'
          AND policyname = 'Service role full access on shop items'
    ) THEN
        CREATE POLICY "Service role full access on shop items"
            ON public.corre_shop_items
            FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;
