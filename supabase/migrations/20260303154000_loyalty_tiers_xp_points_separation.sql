BEGIN;

-- Keep plans authoritative for membership tier (Stripe/webhook), not points.
DROP TRIGGER IF EXISTS trigger_update_tier ON public.users;
DROP FUNCTION IF EXISTS public.update_membership_tier();

-- Ensure loyalty discount tiers support current plans plus legacy aliases.
CREATE TABLE IF NOT EXISTS public.discount_tiers (
    tier TEXT PRIMARY KEY,
    discount_percentage INTEGER NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

INSERT INTO public.discount_tiers (tier, discount_percentage)
VALUES
    ('free', 0),
    ('pro', 10),
    ('club', 20),
    ('basico', 10),
    ('baixa_pace', 20),
    ('parceiros', 20)
ON CONFLICT (tier) DO UPDATE
SET discount_percentage = EXCLUDED.discount_percentage;

-- Validate loyalty QR against canonical tier mapping and always return one row on success.
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
            p_user_id::TEXT || p_timestamp::TEXT,
            v_user.qr_secret,
            'sha256'
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Award XP and points together for Strava activities so XP discounts become attainable.
CREATE OR REPLACE FUNCTION public.award_strava_activity_points(
    p_strava_activity_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
    v_activity RECORD;
    v_distance_km DECIMAL(10,2);
    v_points INTEGER;
    v_xp INTEGER;
    v_tx_id UUID;
    v_source_type TEXT;
    v_new_xp INTEGER;
    v_new_level TEXT;
BEGIN
    SELECT * INTO v_activity
    FROM public.strava_activities
    WHERE strava_id = p_strava_activity_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Activity not found');
    END IF;

    IF v_activity.points_awarded = TRUE THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Points already awarded',
            'points_transaction_id', v_activity.points_transaction_id
        );
    END IF;

    IF v_activity.activity_type NOT IN ('Run', 'TrailRun', 'VirtualRun') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Activity type not eligible for points',
            'activity_type', v_activity.activity_type
        );
    END IF;

    v_distance_km := COALESCE(v_activity.distance_meters, 0) / 1000.0;
    v_points := calculate_run_points(v_distance_km);

    -- 100 XP per km keeps progression meaningful against 10k/15k thresholds.
    v_xp := GREATEST(10, FLOOR(v_distance_km * 100)::INTEGER);

    IF v_activity.name ILIKE '%race%'
       OR v_activity.name ILIKE '%marathon%'
       OR v_activity.name ILIKE '%corrida%'
       OR v_activity.name ILIKE '%challenge%' THEN
        v_source_type := 'special';
    ELSE
        v_source_type := 'routine';
    END IF;

    SELECT new_xp, new_level, points_transaction_id
    INTO v_new_xp, v_new_level, v_tx_id
    FROM add_xp_and_points(
        v_activity.user_id,
        v_xp,
        v_points,
        v_source_type,
        v_activity.id,
        'Strava: ' || COALESCE(v_activity.name, 'Activity') || ' (' || ROUND(v_distance_km, 2) || ' km)'
    );

    UPDATE public.strava_activities
    SET points_awarded = TRUE,
        points_earned = v_points,
        points_transaction_id = v_tx_id
    WHERE strava_id = p_strava_activity_id;

    INSERT INTO public.notifications (user_id, title, body, type, data)
    VALUES (
        v_activity.user_id,
        'Strava Run Synced!',
        'You earned ' || v_points || ' points and ' || v_xp || ' XP for "' ||
          COALESCE(v_activity.name, 'your run') || '" (' || ROUND(v_distance_km, 1) || ' km)',
        'points',
        jsonb_build_object(
            'strava_activity_id', p_strava_activity_id,
            'points', v_points,
            'xp', v_xp,
            'distance_km', ROUND(v_distance_km, 2),
            'source_type', v_source_type,
            'xp_level', v_new_level
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'points_awarded', v_points,
        'xp_awarded', v_xp,
        'new_xp', v_new_xp,
        'new_level', v_new_level,
        'source_type', v_source_type,
        'points_transaction_id', v_tx_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
