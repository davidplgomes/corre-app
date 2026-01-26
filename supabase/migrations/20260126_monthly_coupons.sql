-- =====================================================
-- MONTHLY COUPONS SYSTEM
-- Execute this in Supabase Dashboard > SQL Editor
-- Note: pg_cron requires Supabase Pro plan
-- =====================================================

-- 1. Discount coupons table
CREATE TABLE IF NOT EXISTS public.discount_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    discount_percentage INTEGER NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_coupons_user ON public.discount_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.discount_coupons(code);

-- Enable RLS
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

-- Users can view their own coupons
CREATE POLICY "Users can view own coupons" ON public.discount_coupons
    FOR SELECT USING (auth.uid() = user_id);

-- 2. Discount tiers by membership
CREATE TABLE IF NOT EXISTS public.discount_tiers (
    tier TEXT PRIMARY KEY,
    discount_percentage INTEGER NOT NULL
);

INSERT INTO public.discount_tiers (tier, discount_percentage) VALUES
    ('free', 0),
    ('basico', 5),
    ('baixa_pace', 10),
    ('parceiros', 15)
ON CONFLICT (tier) DO UPDATE SET discount_percentage = EXCLUDED.discount_percentage;

-- 3. Function to generate monthly coupons for qualifying users
CREATE OR REPLACE FUNCTION generate_monthly_coupons()
RETURNS INTEGER AS $$
DECLARE
    v_user RECORD;
    v_coupon_count INTEGER := 0;
    v_discount INTEGER;
BEGIN
    -- Loop through users with 12+ points this month
    FOR v_user IN 
        SELECT id, current_month_points, membership_tier
        FROM public.users
        WHERE current_month_points >= 12
    LOOP
        -- Determine discount based on tier
        SELECT discount_percentage INTO v_discount
        FROM public.discount_tiers
        WHERE tier = v_user.membership_tier;
        
        -- Add bonus for high performers
        IF v_user.current_month_points >= 50 THEN
            v_discount := v_discount + 10;
        ELSIF v_user.current_month_points >= 25 THEN
            v_discount := v_discount + 5;
        END IF;
        
        -- Ensure minimum 10% for qualifying
        v_discount := GREATEST(v_discount, 10);
        
        -- Create coupon
        INSERT INTO public.discount_coupons (
            user_id, 
            code, 
            discount_percentage, 
            valid_from, 
            valid_until
        ) VALUES (
            v_user.id,
            'CORRE-' || UPPER(SUBSTRING(md5(random()::text || v_user.id::text) FROM 1 FOR 8)),
            v_discount,
            DATE_TRUNC('month', NOW()),
            (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')::DATE
        );
        
        v_coupon_count := v_coupon_count + 1;
    END LOOP;
    
    RETURN v_coupon_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to reset monthly points (called after coupon generation)
CREATE OR REPLACE FUNCTION reset_monthly_points()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.users
    SET current_month_points = 0
    WHERE current_month_points > 0;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Combined monthly job function
CREATE OR REPLACE FUNCTION run_monthly_rewards_job()
RETURNS JSONB AS $$
DECLARE
    v_coupons INTEGER;
    v_reset INTEGER;
BEGIN
    -- Generate coupons first
    v_coupons := generate_monthly_coupons();
    
    -- Then reset points
    v_reset := reset_monthly_points();
    
    RETURN jsonb_build_object(
        'coupons_generated', v_coupons,
        'users_reset', v_reset,
        'executed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Schedule with pg_cron (requires Pro plan)
-- Run on 1st of each month at 00:05 UTC
-- Uncomment when pg_cron is available:
-- SELECT cron.schedule('monthly-rewards', '5 0 1 * *', 'SELECT run_monthly_rewards_job()');

-- 7. Get user's active coupons
CREATE OR REPLACE FUNCTION get_user_coupons(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    code TEXT,
    discount_percentage INTEGER,
    valid_from DATE,
    valid_until DATE,
    is_used BOOLEAN,
    is_expired BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.code,
        dc.discount_percentage,
        dc.valid_from,
        dc.valid_until,
        dc.is_used,
        (CURRENT_DATE > dc.valid_until) as is_expired
    FROM public.discount_coupons dc
    WHERE dc.user_id = p_user_id
    ORDER BY dc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Validate and mark coupon as used
CREATE OR REPLACE FUNCTION use_coupon(p_code TEXT, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_coupon RECORD;
BEGIN
    -- Get coupon
    SELECT * INTO v_coupon
    FROM public.discount_coupons
    WHERE code = p_code AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Coupon not found');
    END IF;
    
    IF v_coupon.is_used THEN
        RETURN jsonb_build_object('success', false, 'error', 'Coupon already used');
    END IF;
    
    IF CURRENT_DATE > v_coupon.valid_until THEN
        RETURN jsonb_build_object('success', false, 'error', 'Coupon expired');
    END IF;
    
    IF CURRENT_DATE < v_coupon.valid_from THEN
        RETURN jsonb_build_object('success', false, 'error', 'Coupon not yet valid');
    END IF;
    
    -- Mark as used
    UPDATE public.discount_coupons
    SET is_used = true, used_at = NOW()
    WHERE id = v_coupon.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'discount_percentage', v_coupon.discount_percentage
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
