-- =====================================================
-- LOYALTY CARD SYSTEM (TOTP QR)
-- Execute this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Add secret key to users table for generating secure QR codes
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS qr_secret TEXT DEFAULT encode(gen_random_bytes(32), 'hex');

-- 2. Ensure discount tiers exist (if not run previously)
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

-- 3. Install pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. RPC to validate dynamic QR code
-- Wraps logic to check timestamp window (60s) and signature
CREATE OR REPLACE FUNCTION validate_qr_code(
    p_user_id UUID,
    p_timestamp BIGINT,
    p_signature TEXT
) RETURNS TABLE(
    valid BOOLEAN, 
    tier TEXT, 
    discount INTEGER, 
    user_name TEXT,
    error_message TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_expected_sig TEXT;
    v_now BIGINT;
BEGIN
    -- Get current unix timestamp
    v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;
    
    -- Check timestamp window (60 seconds max diff)
    IF ABS(v_now - p_timestamp) > 60 THEN
        RETURN QUERY SELECT false, NULL::TEXT, 0, NULL::TEXT, 'QR Code expired';
        RETURN;
    END IF;
    
    -- Get user
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::TEXT, 0, NULL::TEXT, 'User not found';
        RETURN;
    END IF;
    
    -- Verify signature
    -- Signature = HMAC-SHA256(user_id + timestamp, qr_secret)
    -- Simplified here using simple hash for demo if HMAC is complex in pure SQL without raw keys exposed
    -- In production, we use pgcrypto's hmac function
    v_expected_sig := encode(
        hmac(
            p_user_id::TEXT || p_timestamp::TEXT,
            v_user.qr_secret,
            'sha256'
        ),
        'hex'
    );
    
    IF v_expected_sig != p_signature THEN
        RETURN QUERY SELECT false, NULL::TEXT, 0, NULL::TEXT, 'Invalid signature';
        RETURN;
    END IF;
    
    -- Return discount info
    RETURN QUERY 
    SELECT 
        true,
        v_user.membership_tier,
        COALESCE(d.discount_percentage, 0),
        v_user.full_name,
        NULL::TEXT
    FROM public.discount_tiers d
    WHERE d.tier = v_user.membership_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
