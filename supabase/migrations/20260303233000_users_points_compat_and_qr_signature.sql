BEGIN;

-- -----------------------------------------------------------------------------
-- Legacy compatibility: keep users.current_points available and synchronized.
-- Some older policies/functions still reference this column.
-- -----------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS current_points INTEGER;

UPDATE public.users
SET current_points = COALESCE(current_month_points, 0)
WHERE current_points IS NULL;

ALTER TABLE public.users
  ALTER COLUMN current_points SET DEFAULT 0;

ALTER TABLE public.users
  ALTER COLUMN current_points SET NOT NULL;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_current_points_non_negative;

ALTER TABLE public.users
  ADD CONSTRAINT users_current_points_non_negative
  CHECK (current_points >= 0);

CREATE OR REPLACE FUNCTION public.sync_users_legacy_points_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.current_month_points IS NULL AND NEW.current_points IS NOT NULL THEN
      NEW.current_month_points := NEW.current_points;
    END IF;

    IF NEW.current_points IS NULL THEN
      NEW.current_points := COALESCE(NEW.current_month_points, 0);
    END IF;

    IF NEW.current_month_points IS NULL THEN
      NEW.current_month_points := COALESCE(NEW.current_points, 0);
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.current_month_points IS DISTINCT FROM OLD.current_month_points THEN
    NEW.current_points := COALESCE(NEW.current_month_points, 0);
  ELSIF NEW.current_points IS DISTINCT FROM OLD.current_points THEN
    NEW.current_month_points := COALESCE(NEW.current_points, 0);
  END IF;

  NEW.current_points := COALESCE(NEW.current_points, 0);
  NEW.current_month_points := COALESCE(NEW.current_month_points, 0);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_users_legacy_points_columns ON public.users;

CREATE TRIGGER trigger_sync_users_legacy_points_columns
BEFORE INSERT OR UPDATE OF current_points, current_month_points
ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_users_legacy_points_columns();

-- -----------------------------------------------------------------------------
-- Definitive QR signature functions without pgcrypto/hmac dependency.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_user_qr_payload(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_signature := md5(p_user_id::TEXT || ':' || v_timestamp::TEXT || ':' || v_secret);

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

    v_expected_sig := md5(
      p_user_id::TEXT || ':' || p_timestamp::TEXT || ':' || v_user.qr_secret
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

COMMIT;
