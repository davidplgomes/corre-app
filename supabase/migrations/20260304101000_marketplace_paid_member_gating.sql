BEGIN;

CREATE OR REPLACE FUNCTION public.is_paid_membership_tier(p_tier TEXT)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(coalesce(p_tier, 'free')) IN ('pro', 'club', 'basico', 'baixa_pace', 'parceiros');
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_paid_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND public.is_paid_membership_tier(u.membership_tier)
  );
$$;

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers can view own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Admins can view all marketplace listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers can insert own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers can insert own paid listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers can update own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers can update own paid listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers can delete own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Sellers can delete own paid listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Admins can insert marketplace listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Admins can update marketplace listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Admins can delete marketplace listings" ON public.marketplace_listings;

CREATE POLICY "Anyone can view active listings"
  ON public.marketplace_listings
  FOR SELECT
  USING (status = 'active');

CREATE POLICY "Sellers can view own listings"
  ON public.marketplace_listings
  FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all marketplace listings"
  ON public.marketplace_listings
  FOR SELECT
  USING (public.is_current_user_admin());

CREATE POLICY "Sellers can insert own paid listings"
  ON public.marketplace_listings
  FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND public.is_current_user_paid_member()
  );

CREATE POLICY "Sellers can update own paid listings"
  ON public.marketplace_listings
  FOR UPDATE
  USING (
    auth.uid() = seller_id
    AND public.is_current_user_paid_member()
  )
  WITH CHECK (
    auth.uid() = seller_id
    AND public.is_current_user_paid_member()
  );

CREATE POLICY "Sellers can delete own paid listings"
  ON public.marketplace_listings
  FOR DELETE
  USING (
    auth.uid() = seller_id
    AND public.is_current_user_paid_member()
  );

CREATE POLICY "Admins can insert marketplace listings"
  ON public.marketplace_listings
  FOR INSERT
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update marketplace listings"
  ON public.marketplace_listings
  FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can delete marketplace listings"
  ON public.marketplace_listings
  FOR DELETE
  USING (public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.hide_marketplace_listings_on_free_downgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND lower(coalesce(OLD.membership_tier, 'free')) <> lower(coalesce(NEW.membership_tier, 'free'))
     AND public.is_paid_membership_tier(OLD.membership_tier)
     AND NOT public.is_paid_membership_tier(NEW.membership_tier) THEN
    UPDATE public.marketplace_listings
    SET status = 'removed',
        updated_at = NOW()
    WHERE seller_id = NEW.id
      AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hide_marketplace_listings_on_free_downgrade ON public.users;

CREATE TRIGGER trg_hide_marketplace_listings_on_free_downgrade
AFTER UPDATE OF membership_tier ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.hide_marketplace_listings_on_free_downgrade();

UPDATE public.marketplace_listings ml
SET status = 'removed',
    updated_at = NOW()
FROM public.users u
WHERE ml.seller_id = u.id
  AND ml.status = 'active'
  AND NOT public.is_paid_membership_tier(u.membership_tier);

COMMIT;
