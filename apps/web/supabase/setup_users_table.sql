-- =============================================================================
-- STEP 1: Add the 'role' column to your existing users table
-- Run this FIRST, then run STEP 2 below
-- =============================================================================

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Add a check constraint (optional but recommended)
-- ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'partner', 'admin'));



-- =============================================================================
-- STEP 2: Run this AFTER Step 1 completes successfully
-- This promotes a user to admin
-- =============================================================================

-- Replace with your actual email:
-- UPDATE public.users SET role = 'admin' WHERE email = 'your-email@example.com';



-- =============================================================================
-- STEP 3 (Optional): Create partner tables if you want partners to manage places/coupons
-- =============================================================================

-- Partners table (business info for partner users)
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    business_name TEXT,
    business_logo_url TEXT,
    business_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Partners can read/update their own data
DROP POLICY IF EXISTS "Partners can read own data" ON public.partners;
CREATE POLICY "Partners can read own data" ON public.partners
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Partners can update own data" ON public.partners;
CREATE POLICY "Partners can update own data" ON public.partners
    FOR UPDATE USING (auth.uid() = id);

-- Partner places (physical locations)
CREATE TABLE IF NOT EXISTS public.partner_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    latitude FLOAT,
    longitude FLOAT,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.partner_places ENABLE ROW LEVEL SECURITY;

-- Partners can manage their own places
DROP POLICY IF EXISTS "Partners can CRUD own places" ON public.partner_places;
CREATE POLICY "Partners can CRUD own places" ON public.partner_places
    FOR ALL USING (auth.uid() = partner_id);

-- Anyone can read active places
DROP POLICY IF EXISTS "Anyone can read active places" ON public.partner_places;
CREATE POLICY "Anyone can read active places" ON public.partner_places
    FOR SELECT USING (is_active = TRUE);

-- Partner coupons
CREATE TABLE IF NOT EXISTS public.partner_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    discount_percent INTEGER CHECK (discount_percent > 0 AND discount_percent <= 100),
    min_tier TEXT DEFAULT 'bronze',
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.partner_coupons ENABLE ROW LEVEL SECURITY;

-- Partners can manage their own coupons
DROP POLICY IF EXISTS "Partners can CRUD own coupons" ON public.partner_coupons;
CREATE POLICY "Partners can CRUD own coupons" ON public.partner_coupons
    FOR ALL USING (auth.uid() = partner_id);

-- Anyone can read active coupons
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.partner_coupons;
CREATE POLICY "Anyone can read active coupons" ON public.partner_coupons
    FOR SELECT USING (is_active = TRUE);

-- Coupon redemptions tracking
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.partner_coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coupon_id, user_id)
);

-- Enable RLS
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can see their own redemptions
DROP POLICY IF EXISTS "Users can see own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can see own redemptions" ON public.coupon_redemptions
    FOR SELECT USING (auth.uid() = user_id);
