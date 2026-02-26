-- =====================================================
-- MARKETPLACE C2C SCHEMA (STRIPE CONNECT)
-- Execute this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Seller Accounts (Links User to Stripe Connect)
CREATE TABLE IF NOT EXISTS public.seller_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    stripe_account_id TEXT NOT NULL, -- 'acct_...'
    onboarding_complete BOOLEAN DEFAULT false,
    charges_enabled BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id),
    UNIQUE(stripe_account_id)
);

-- RLS: Sellers can see their own account
ALTER TABLE public.seller_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own seller account" ON public.seller_accounts
    FOR SELECT USING (auth.uid() = user_id);

-- 2. Marketplace Listings
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 500), -- Min R$ 5,00
    images TEXT[], -- Array of Supabase Storage URLs
    condition TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
    category TEXT CHECK (category IN ('shoes', 'clothing', 'accessories', 'electronics', 'other')),
    size TEXT,
    brand TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'reserved', 'removed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created ON public.marketplace_listings(created_at DESC);

-- RLS
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Everyone can view active listings
CREATE POLICY "Anyone can view active listings" ON public.marketplace_listings
    FOR SELECT USING (status = 'active' OR auth.uid() = seller_id);

-- Only seller can update/delete
CREATE POLICY "Sellers can update own listings" ON public.marketplace_listings
    FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert own listings" ON public.marketplace_listings
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- 3. Orders (Transactions)
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id),
    buyer_id UUID NOT NULL REFERENCES public.users(id),
    seller_id UUID NOT NULL REFERENCES public.users(id),
    amount_cents INTEGER NOT NULL,
    platform_fee_cents INTEGER NOT NULL, -- 5%
    seller_amount_cents INTEGER NOT NULL, -- 95%
    stripe_payment_intent_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'completed', 'cancelled', 'refunded')),
    shipping_address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders (buyer or seller)" ON public.marketplace_orders
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 4. Favorites / Saved Items
CREATE TABLE IF NOT EXISTS public.marketplace_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage favorites" ON public.marketplace_favorites
    FOR ALL USING (auth.uid() = user_id);

-- 5. Helper Function to Search Listings (Optional but good for filtering)
CREATE OR REPLACE FUNCTION search_listings(
    p_query TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_min_price INTEGER DEFAULT NULL,
    p_max_price INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS SETOF public.marketplace_listings AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.marketplace_listings
    WHERE status = 'active'
    AND (p_query IS NULL OR title ILIKE '%' || p_query || '%' OR description ILIKE '%' || p_query || '%')
    AND (p_category IS NULL OR category = p_category)
    AND (p_min_price IS NULL OR price_cents >= p_min_price)
    AND (p_max_price IS NULL OR price_cents <= p_max_price)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
