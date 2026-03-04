-- =====================================================
-- Fix QR HMAC call signature compatibility
-- - Ensures pgcrypto exists
-- - Uses bytea hmac signature via convert_to(...) for compatibility
-- =====================================================

BEGIN;

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
  EXCEPTION
    WHEN OTHERS THEN
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
  END;
END
$$;

CREATE OR REPLACE FUNCTION public.generate_user_qr_payload(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret TEXT;
  v_timestamp BIGINT;
  v_signature TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF auth.uid() <> p_user_id AND NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  SELECT qr_secret INTO v_secret
  FROM public.users
  WHERE id = p_user_id;

  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR secret unavailable');
  END IF;

  v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
  v_signature := encode(
    hmac(
      convert_to(p_user_id::TEXT || v_timestamp::TEXT, 'UTF8'),
      convert_to(v_secret, 'UTF8'),
      'sha256'::TEXT
    ),
    'hex'
  );

  RETURN jsonb_build_object(
    'success', true,
    'payload', jsonb_build_object(
      'id', p_user_id::TEXT,
      'ts', v_timestamp,
      'sig', v_signature
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_qr_code(
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
    v_tier TEXT;
    v_discount INTEGER;
BEGIN
    v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;

    IF ABS(v_now - p_timestamp) > 60 THEN
        RETURN QUERY SELECT false, NULL::TEXT, 0, NULL::TEXT, 'QR Code expired';
        RETURN;
    END IF;

    SELECT id, full_name, membership_tier, qr_secret
    INTO v_user
    FROM public.users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::TEXT, 0, NULL::TEXT, 'User not found';
        RETURN;
    END IF;

    IF v_user.qr_secret IS NULL OR LENGTH(v_user.qr_secret) = 0 THEN
        RETURN QUERY SELECT false, NULL::TEXT, 0, NULL::TEXT, 'QR secret unavailable';
        RETURN;
    END IF;

    v_expected_sig := encode(
        hmac(
            convert_to(p_user_id::TEXT || p_timestamp::TEXT, 'UTF8'),
            convert_to(v_user.qr_secret, 'UTF8'),
            'sha256'::TEXT
        ),
        'hex'
    );

    IF v_expected_sig <> p_signature THEN
        RETURN QUERY SELECT false, NULL::TEXT, 0, NULL::TEXT, 'Invalid signature';
        RETURN;
    END IF;

    v_tier := CASE LOWER(COALESCE(v_user.membership_tier, 'free'))
        WHEN 'pro' THEN 'pro'
        WHEN 'club' THEN 'club'
        WHEN 'basico' THEN 'pro'
        WHEN 'baixa_pace' THEN 'club'
        WHEN 'parceiros' THEN 'club'
        ELSE 'free'
    END;

    SELECT discount_percentage
    INTO v_discount
    FROM public.discount_tiers
    WHERE tier = v_tier
    LIMIT 1;

    RETURN QUERY
    SELECT true, v_tier, COALESCE(v_discount, 0), v_user.full_name, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

COMMIT;
