-- Add referral_link column to partner_coupons
-- Allows partners to link users directly to their website from the coupon detail modal

ALTER TABLE public.partner_coupons
ADD COLUMN IF NOT EXISTS referral_link TEXT;

COMMENT ON COLUMN public.partner_coupons.referral_link IS
  'Optional URL to redirect users to the partner website after viewing/redeeming a coupon';
