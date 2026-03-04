-- =====================================================
-- Canonicalize shop pricing sync:
-- - price_cents is always canonical cents
-- - points_price is legacy mirror only
-- - remove legacy x100 heuristic
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_corre_shop_items_pricing()
RETURNS TRIGGER AS $$
BEGIN
    -- Legacy update support: if only points_price changed, mirror to price_cents as-is.
    IF TG_OP = 'UPDATE'
       AND NEW.price_cents IS NOT DISTINCT FROM OLD.price_cents
       AND NEW.points_price IS DISTINCT FROM OLD.points_price
       AND NEW.points_price IS NOT NULL THEN
        NEW.price_cents := GREATEST(0, NEW.points_price);
    END IF;

    -- Legacy input support: if only points_price is provided, copy to price_cents as-is.
    IF NEW.price_cents IS NULL AND NEW.points_price IS NOT NULL THEN
        NEW.price_cents := GREATEST(0, NEW.points_price);
    END IF;

    IF NEW.price_cents IS NOT NULL THEN
        NEW.price_cents := GREATEST(0, NEW.price_cents);
        -- Keep legacy column in sync for older clients still reading points_price.
        NEW.points_price := NEW.price_cents;
    END IF;

    NEW.max_points_discount_percent := GREATEST(0, LEAST(COALESCE(NEW.max_points_discount_percent, 20), 100));
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
