-- Partner Coupons Table for points redemption
-- Users can redeem these coupons by spending points

CREATE TABLE IF NOT EXISTS public.partner_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    partner TEXT NOT NULL, -- Partner/brand name (Nike, Centauro, etc.)
    code TEXT NOT NULL,
    points_required INTEGER NOT NULL CHECK (points_required >= 0),
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'freebie')),
    discount_value INTEGER, -- For percentage or fixed amount
    category TEXT NOT NULL CHECK (category IN ('fashion', 'health', 'sports', 'apps', 'drinks', 'other')),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    stock_limit INTEGER, -- Null = unlimited
    redeemed_count INTEGER DEFAULT 0,
    image_url TEXT,
    terms TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tracking which users redeemed which coupons
CREATE TABLE IF NOT EXISTS public.user_coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES public.partner_coupons(id) ON DELETE CASCADE,
    code_used TEXT NOT NULL, -- The actual coupon code provided to the user
    points_spent INTEGER NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    is_used BOOLEAN DEFAULT false, -- Whether they actually used the coupon at the partner
    used_at TIMESTAMPTZ,
    UNIQUE(user_id, coupon_id, redeemed_at) -- Prevent duplicate redemptions
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_coupons_active ON public.partner_coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_partner_coupons_category ON public.partner_coupons(category);
CREATE INDEX IF NOT EXISTS idx_partner_coupons_expires ON public.partner_coupons(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_redemptions_user ON public.user_coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_redemptions_coupon ON public.user_coupon_redemptions(coupon_id);

-- Enable RLS
ALTER TABLE public.partner_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_coupons
CREATE POLICY "Anyone can view active coupons"
    ON public.partner_coupons FOR SELECT
    USING (is_active = true AND expires_at > NOW());

-- RLS Policies for user_coupon_redemptions
CREATE POLICY "Users can view own redemptions"
    ON public.user_coupon_redemptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own redemptions"
    ON public.user_coupon_redemptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to redeem coupon with points
CREATE OR REPLACE FUNCTION redeem_partner_coupon(
    p_user_id UUID,
    p_coupon_id UUID
) RETURNS JSON AS $$
DECLARE
    v_coupon RECORD;
    v_user_points INTEGER;
    v_redemption_id UUID;
    v_unique_code TEXT;
BEGIN
    -- Get coupon details
    SELECT * INTO v_coupon
    FROM public.partner_coupons
    WHERE id = p_coupon_id
        AND is_active = true
        AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Coupon not found or expired'
        );
    END IF;

    -- Check stock
    IF v_coupon.stock_limit IS NOT NULL AND v_coupon.redeemed_count >= v_coupon.stock_limit THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Coupon out of stock'
        );
    END IF;

    -- Get user's available points (using the wallet function)
    SELECT get_available_points(p_user_id) INTO v_user_points;

    IF v_user_points < v_coupon.points_required THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Insufficient points',
            'required', v_coupon.points_required,
            'available', v_user_points
        );
    END IF;

    -- Generate unique code for this redemption
    v_unique_code := v_coupon.code || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8);

    -- Create redemption record
    INSERT INTO public.user_coupon_redemptions (user_id, coupon_id, code_used, points_spent)
    VALUES (p_user_id, p_coupon_id, v_unique_code, v_coupon.points_required)
    RETURNING id INTO v_redemption_id;

    -- Deduct points from user's wallet (add negative transaction)
    INSERT INTO public.wallet_transactions (user_id, amount, source, description)
    VALUES (
        p_user_id,
        -v_coupon.points_required,
        'coupon_redemption',
        'Redeemed: ' || v_coupon.title || ' from ' || v_coupon.partner
    );

    -- Update coupon redeemed count
    UPDATE public.partner_coupons
    SET redeemed_count = redeemed_count + 1,
        updated_at = NOW()
    WHERE id = p_coupon_id;

    RETURN json_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'code', v_unique_code,
        'coupon', json_build_object(
            'title', v_coupon.title,
            'partner', v_coupon.partner,
            'description', v_coupon.description
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample partner coupons
INSERT INTO public.partner_coupons (title, description, partner, code, points_required, discount_type, discount_value, category, expires_at) VALUES
('10% OFF', 'Em qualquer compra na Nike Store', 'Nike', 'CORRE10NIKE', 500, 'percentage', 10, 'fashion', NOW() + INTERVAL '30 days'),
('15% OFF', 'Suplementos e vitaminas', 'Growth Supplements', 'CORREGROW15', 750, 'percentage', 15, 'health', NOW() + INTERVAL '60 days'),
('Frete Grátis', 'Em pedidos acima de R$100', 'Netshoes', 'CORREFREE', 300, 'freebie', NULL, 'fashion', NOW() + INTERVAL '15 days'),
('20% OFF', 'Em tênis de corrida selecionados', 'Centauro', 'CORRERUN20', 1000, 'percentage', 20, 'sports', NOW() + INTERVAL '10 days'),
('R$30 OFF', 'Na primeira assinatura mensal', 'Strava Premium', 'CORRESTRAVA', 800, 'fixed', 3000, 'apps', NOW() + INTERVAL '90 days'),
('2x1', 'Leve 2 e pague 1 em bebidas isotônicas', 'Gatorade', 'CORRE2X1G', 400, 'freebie', NULL, 'drinks', NOW() + INTERVAL '5 days');
