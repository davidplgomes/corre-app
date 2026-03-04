-- =====================================================
-- Fix legacy shop prices that were multiplied by 100
-- Criteria:
--   points_price BETWEEN 1 AND 999
--   price_cents = points_price * 100
-- =====================================================

CREATE TABLE IF NOT EXISTS public.shop_price_fix_backup (
    item_id UUID PRIMARY KEY,
    old_price_cents INTEGER NOT NULL,
    old_points_price INTEGER,
    new_price_cents INTEGER NOT NULL,
    fixed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.shop_price_fix_backup IS
    'Backup log for one-time correction of legacy corre_shop_items prices.';

INSERT INTO public.shop_price_fix_backup (
    item_id,
    old_price_cents,
    old_points_price,
    new_price_cents
)
SELECT
    id,
    price_cents,
    points_price,
    points_price
FROM public.corre_shop_items
WHERE points_price BETWEEN 1 AND 999
  AND price_cents = points_price * 100
ON CONFLICT (item_id) DO NOTHING;

UPDATE public.corre_shop_items AS item
SET
    price_cents = backup.new_price_cents,
    updated_at = NOW()
FROM public.shop_price_fix_backup AS backup
WHERE item.id = backup.item_id
  AND item.price_cents IS DISTINCT FROM backup.new_price_cents;

DO $$
DECLARE
    v_fixed_count INTEGER;
    v_remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_fixed_count
    FROM public.shop_price_fix_backup;

    SELECT COUNT(*) INTO v_remaining_count
    FROM public.corre_shop_items
    WHERE points_price BETWEEN 1 AND 999
      AND price_cents = points_price * 100;

    RAISE NOTICE 'shop legacy price fix backup rows: %', v_fixed_count;
    RAISE NOTICE 'shop legacy price suspicious rows remaining: %', v_remaining_count;
END $$;
