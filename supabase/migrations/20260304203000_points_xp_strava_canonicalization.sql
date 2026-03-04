BEGIN;

-- ============================================================================
-- Canonical points source = point_transactions ledger
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS current_points INTEGER DEFAULT 0;

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
  ADD CONSTRAINT users_current_points_non_negative CHECK (current_points >= 0);

CREATE OR REPLACE FUNCTION public.get_user_active_points(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(points_remaining), 0)::INTEGER
  INTO v_total
  FROM public.point_transactions
  WHERE user_id = p_user_id
    AND points_remaining > 0
    AND expires_at > NOW();

  RETURN COALESCE(v_total, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_user_points_from_ledger(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_points INTEGER;
BEGIN
  v_points := public.get_user_active_points(p_user_id);

  UPDATE public.users
  SET current_month_points = v_points,
      current_points = v_points
  WHERE id = p_user_id;

  RETURN v_points;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_user_points_from_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  IF v_user_id IS NOT NULL THEN
    PERFORM public.sync_user_points_from_ledger(v_user_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_points_from_ledger ON public.point_transactions;
CREATE TRIGGER trg_sync_user_points_from_ledger
AFTER INSERT OR UPDATE OR DELETE ON public.point_transactions
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_user_points_from_ledger();

CREATE OR REPLACE FUNCTION add_points_with_ttl(
  p_user_id UUID,
  p_points INTEGER,
  p_source_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
  v_transaction_id UUID;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'Points must be greater than zero';
  END IF;

  v_expires_at := calculate_points_expiry(p_source_type, NOW());

  INSERT INTO public.point_transactions (
    user_id, points_amount, points_remaining, source_type, source_id, description, expires_at
  ) VALUES (
    p_user_id, p_points, p_points, p_source_type, p_source_id, p_description, v_expires_at
  ) RETURNING id INTO v_transaction_id;

  UPDATE public.users
  SET total_lifetime_points = COALESCE(total_lifetime_points, 0) + p_points
  WHERE id = p_user_id;

  PERFORM public.sync_user_points_from_ledger(p_user_id);

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION consume_points_fifo(
  p_user_id UUID,
  p_points_to_consume INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_remaining INTEGER := p_points_to_consume;
  v_transaction RECORD;
  v_available INTEGER;
BEGIN
  IF p_points_to_consume IS NULL OR p_points_to_consume <= 0 THEN
    RETURN FALSE;
  END IF;

  -- Serialize point consumption per user to avoid concurrent double spending.
  PERFORM 1
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(SUM(points_remaining), 0)::INTEGER INTO v_available
  FROM public.point_transactions
  WHERE user_id = p_user_id
    AND points_remaining > 0
    AND expires_at > NOW();

  IF v_available < p_points_to_consume THEN
    RETURN FALSE;
  END IF;

  FOR v_transaction IN
    SELECT id, points_remaining
    FROM public.point_transactions
    WHERE user_id = p_user_id
      AND points_remaining > 0
      AND expires_at > NOW()
    ORDER BY expires_at ASC, earned_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    IF v_transaction.points_remaining <= v_remaining THEN
      UPDATE public.point_transactions
      SET points_remaining = 0,
          consumed_at = NOW()
      WHERE id = v_transaction.id;

      v_remaining := v_remaining - v_transaction.points_remaining;
    ELSE
      UPDATE public.point_transactions
      SET points_remaining = points_remaining - v_remaining
      WHERE id = v_transaction.id;

      v_remaining := 0;
    END IF;
  END LOOP;

  PERFORM public.sync_user_points_from_ledger(p_user_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_available_points(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN public.get_user_active_points(p_user_id);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.reconcile_users_points_compat(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF p_user_id IS NOT NULL THEN
    UPDATE public.users u
    SET current_month_points = v.points,
        current_points = v.points
    FROM (
      SELECT public.get_user_active_points(p_user_id) AS points
    ) v
    WHERE u.id = p_user_id
      AND (
        u.current_month_points IS DISTINCT FROM v.points
        OR u.current_points IS DISTINCT FROM v.points
      );

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
  END IF;

  UPDATE public.users u
  SET current_month_points = v.points,
      current_points = v.points
  FROM (
    SELECT id AS user_id, public.get_user_active_points(id) AS points
    FROM public.users
  ) v
  WHERE u.id = v.user_id
    AND (
      u.current_month_points IS DISTINCT FROM v.points
      OR u.current_points IS DISTINCT FROM v.points
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Backfill compatibility columns from canonical ledger balance.
SELECT public.reconcile_users_points_compat();

-- Stop legacy monthly points reset (ledger points already expire by TTL).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = 'monthly-points-reset';
    EXCEPTION
      WHEN undefined_table OR undefined_function THEN
        NULL;
    END;
  END IF;
END;
$$;

-- Keep legacy mirrors in sync as points naturally expire over time.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = 'points-compat-reconcile-hourly';
    EXCEPTION
      WHEN undefined_table OR undefined_function THEN
        NULL;
    END;

    BEGIN
      PERFORM cron.schedule(
        'points-compat-reconcile-hourly',
        '15 * * * *',
        $cron$SELECT public.reconcile_users_points_compat()$cron$
      );
    EXCEPTION
      WHEN undefined_table OR undefined_function THEN
        NULL;
    END;
  END IF;
END;
$$;

-- ============================================================================
-- Monthly XP reset policy
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_monthly_xp()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.users
  SET current_xp = 0,
      xp_level = 'starter',
      updated_at = NOW()
  WHERE COALESCE(current_xp, 0) <> 0
     OR COALESCE(xp_level, 'starter') <> 'starter';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = 'monthly-xp-reset';
    EXCEPTION
      WHEN undefined_table OR undefined_function THEN
        NULL;
    END;

    BEGIN
      PERFORM cron.schedule(
        'monthly-xp-reset',
        '10 0 1 * *',
        $cron$SELECT public.reset_monthly_xp()$cron$
      );
    EXCEPTION
      WHEN undefined_table OR undefined_function THEN
        NULL;
    END;
  END IF;
END;
$$;

-- ============================================================================
-- Strava idempotency hardening + failure tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.strava_activity_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  strava_activity_id BIGINT NOT NULL,
  points_awarded INTEGER,
  xp_awarded INTEGER,
  points_transaction_id UUID,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, strava_activity_id)
);

CREATE INDEX IF NOT EXISTS idx_strava_activity_awards_user
  ON public.strava_activity_awards(user_id, awarded_at DESC);

ALTER TABLE public.strava_activity_awards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'strava_activity_awards'
      AND policyname = 'Users can view own strava activity awards'
  ) THEN
    CREATE POLICY "Users can view own strava activity awards"
      ON public.strava_activity_awards FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'strava_activity_awards'
      AND policyname = 'Admins can view all strava activity awards'
  ) THEN
    CREATE POLICY "Admins can view all strava activity awards"
      ON public.strava_activity_awards FOR SELECT
      USING (public.is_current_user_admin());
  END IF;
END;
$$;

INSERT INTO public.strava_activity_awards (
  user_id,
  strava_activity_id,
  points_awarded,
  points_transaction_id,
  awarded_at
)
SELECT
  sa.user_id,
  sa.strava_id,
  COALESCE(sa.points_earned, 0),
  sa.points_transaction_id,
  COALESCE(sa.synced_at, NOW())
FROM public.strava_activities sa
WHERE sa.points_awarded = TRUE
ON CONFLICT (user_id, strava_activity_id) DO UPDATE
SET points_awarded = EXCLUDED.points_awarded,
    points_transaction_id = COALESCE(public.strava_activity_awards.points_transaction_id, EXCLUDED.points_transaction_id);

CREATE TABLE IF NOT EXISTS public.strava_sync_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  strava_athlete_id BIGINT,
  strava_activity_id BIGINT,
  source TEXT NOT NULL CHECK (source IN ('webhook', 'manual_sync', 'retry')),
  stage TEXT NOT NULL,
  error_message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strava_sync_failures_unresolved
  ON public.strava_sync_failures(user_id, created_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_strava_sync_failures_activity
  ON public.strava_sync_failures(strava_activity_id, created_at DESC);

ALTER TABLE public.strava_sync_failures ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'strava_sync_failures'
      AND policyname = 'Users can view own strava sync failures'
  ) THEN
    CREATE POLICY "Users can view own strava sync failures"
      ON public.strava_sync_failures FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'strava_sync_failures'
      AND policyname = 'Admins can view all strava sync failures'
  ) THEN
    CREATE POLICY "Admins can view all strava sync failures"
      ON public.strava_sync_failures FOR SELECT
      USING (public.is_current_user_admin());
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_strava_activity_points(
    p_strava_activity_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
    v_activity RECORD;
    v_existing_award RECORD;
    v_distance_km DECIMAL(10,2);
    v_points INTEGER;
    v_xp INTEGER;
    v_tx_id UUID;
    v_source_type TEXT;
    v_new_xp INTEGER;
    v_new_level TEXT;
    v_award_id UUID;
BEGIN
    SELECT * INTO v_activity
    FROM public.strava_activities
    WHERE strava_id = p_strava_activity_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Activity not found');
    END IF;

    IF v_activity.activity_type NOT IN ('Run', 'TrailRun', 'VirtualRun') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Activity type not eligible for points',
            'activity_type', v_activity.activity_type
        );
    END IF;

    IF v_activity.points_awarded = TRUE THEN
        INSERT INTO public.strava_activity_awards (
            user_id,
            strava_activity_id,
            points_awarded,
            points_transaction_id,
            awarded_at
        )
        VALUES (
            v_activity.user_id,
            p_strava_activity_id,
            COALESCE(v_activity.points_earned, 0),
            v_activity.points_transaction_id,
            COALESCE(v_activity.synced_at, NOW())
        )
        ON CONFLICT (user_id, strava_activity_id) DO NOTHING;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Points already awarded',
            'points_transaction_id', v_activity.points_transaction_id,
            'already_awarded', true
        );
    END IF;

    INSERT INTO public.strava_activity_awards (user_id, strava_activity_id)
    VALUES (v_activity.user_id, p_strava_activity_id)
    ON CONFLICT (user_id, strava_activity_id) DO NOTHING
    RETURNING id INTO v_award_id;

    IF v_award_id IS NULL THEN
        SELECT * INTO v_existing_award
        FROM public.strava_activity_awards
        WHERE user_id = v_activity.user_id
          AND strava_activity_id = p_strava_activity_id
        LIMIT 1;

        UPDATE public.strava_activities
        SET points_awarded = TRUE,
            points_earned = COALESCE(v_existing_award.points_awarded, points_earned),
            points_transaction_id = COALESCE(v_existing_award.points_transaction_id, points_transaction_id)
        WHERE id = v_activity.id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Points already awarded',
            'points_transaction_id', v_existing_award.points_transaction_id,
            'already_awarded', true
        );
    END IF;

    v_distance_km := COALESCE(v_activity.distance_meters, 0) / 1000.0;
    v_points := calculate_run_points(v_distance_km);
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

    UPDATE public.strava_activity_awards
    SET points_awarded = v_points,
        xp_awarded = v_xp,
        points_transaction_id = v_tx_id,
        awarded_at = NOW()
    WHERE id = v_award_id;

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

-- ============================================================================
-- Unify non-Strava point awarding to ledger (avoid drift)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_and_create_checkin(
    p_event_id UUID,
    p_user_id UUID,
    p_check_in_lat DOUBLE PRECISION,
    p_check_in_lng DOUBLE PRECISION
) RETURNS JSONB AS $$
DECLARE
    v_event RECORD;
    v_user_location GEOGRAPHY;
    v_distance DOUBLE PRECISION;
    v_points INTEGER;
    v_check_in_id UUID;
    v_source_type TEXT;
    v_month DATE;
BEGIN
    SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Event not found');
    END IF;

    v_user_location := ST_SetSRID(ST_MakePoint(p_check_in_lng, p_check_in_lat), 4326);
    v_distance := ST_Distance(v_user_location, v_event.location_geo);

    IF v_distance > COALESCE(v_event.check_in_radius_meters, 300) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_message', 'Too far from event location',
            'distance_meters', ROUND(v_distance::NUMERIC, 2)
        );
    END IF;

    IF NOT (NOW() BETWEEN v_event.event_datetime - INTERVAL '30 minutes'
            AND v_event.event_datetime + INTERVAL '30 minutes') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_message', 'Outside check-in time window'
        );
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.check_ins
      WHERE event_id = p_event_id AND user_id = p_user_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Already checked in');
    END IF;

    v_source_type := CASE COALESCE(v_event.event_type, 'routine')
        WHEN 'race' THEN 'race'
        WHEN 'special' THEN 'special'
        WHEN 'group_run' THEN 'special'
        WHEN 'coffee_run' THEN 'special'
        WHEN 'social' THEN 'special'
        ELSE 'routine'
    END;

    v_points := COALESCE(v_event.points_value,
        CASE v_source_type
          WHEN 'race' THEN 10
          WHEN 'special' THEN 5
          ELSE 3
        END
    );

    INSERT INTO public.check_ins (event_id, user_id, points_earned, check_in_lat, check_in_lng)
    VALUES (p_event_id, p_user_id, v_points, p_check_in_lat, p_check_in_lng)
    RETURNING id INTO v_check_in_id;

    PERFORM public.add_points_with_ttl(
      p_user_id,
      v_points,
      v_source_type,
      v_check_in_id,
      'Event check-in: ' || COALESCE(v_event.title, 'Event')
    );

    v_month := DATE_TRUNC('month', NOW())::DATE;
    INSERT INTO public.monthly_leaderboard (user_id, month, points, updated_at)
    VALUES (p_user_id, v_month, v_points, NOW())
    ON CONFLICT (user_id, month)
    DO UPDATE SET
      points = public.monthly_leaderboard.points + EXCLUDED.points,
      updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'check_in_id', v_check_in_id,
        'check_in', jsonb_build_object(
          'id', v_check_in_id,
          'event_id', p_event_id,
          'user_id', p_user_id,
          'points_earned', v_points,
          'checked_in_at', NOW()
        ),
        'points_earned', v_points,
        'distance_meters', ROUND(v_distance::NUMERIC, 2)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_points ON public.check_ins;

-- Keep runs as activity history only. Official rewards come from Strava sync.
CREATE OR REPLACE FUNCTION submit_secure_run(
    p_user_id UUID,
    p_started_at TIMESTAMPTZ,
    p_ended_at TIMESTAMPTZ,
    p_route_data JSONB,
    p_step_count INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_run_id UUID;
    v_distance_meters DOUBLE PRECISION := 0;
    v_duration_seconds INTEGER;
    v_avg_speed_kmh DECIMAL(10,2);
    v_status TEXT := 'verified';
    v_reason TEXT := NULL;
    v_route_geom GEOMETRY;
    v_points_array GEOMETRY[];
BEGIN
    v_duration_seconds := EXTRACT(EPOCH FROM (p_ended_at - p_started_at));

    IF v_duration_seconds <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid duration');
    END IF;

    IF jsonb_array_length(p_route_data) < 2 THEN
        v_distance_meters := 0;
    ELSE
        SELECT array_agg(ST_SetSRID(ST_MakePoint((x->>'lng')::float, (x->>'lat')::float), 4326))
        INTO v_points_array
        FROM jsonb_array_elements(p_route_data) x;

        v_route_geom := ST_MakeLine(v_points_array);
        v_distance_meters := ST_Length(v_route_geom::geography);
    END IF;

    IF v_duration_seconds > 0 THEN
        v_avg_speed_kmh := (v_distance_meters / 1000.0) / (v_duration_seconds / 3600.0);
    ELSE
        v_avg_speed_kmh := 0;
    END IF;

    IF v_avg_speed_kmh > 35 THEN
        v_status := 'flagged';
        v_reason := 'Speed too high (' || ROUND(v_avg_speed_kmh, 1) || ' km/h). Likely vehicle.';
    END IF;

    IF v_distance_meters > 500 AND p_step_count < (v_distance_meters / 20) THEN
        v_status := 'flagged';
        v_reason := 'Step count too low for distance. Likely bike or vehicle.';
    END IF;

    INSERT INTO public.runs (
        user_id,
        distance_km,
        duration_seconds,
        step_count,
        points_earned,
        route_data,
        started_at,
        ended_at,
        verification_status,
        verification_reason,
        avg_speed_kmh
    ) VALUES (
        p_user_id,
        ROUND((v_distance_meters / 1000.0)::numeric, 2),
        v_duration_seconds,
        p_step_count,
        0,
        p_route_data,
        p_started_at,
        p_ended_at,
        v_status,
        v_reason,
        v_avg_speed_kmh
    ) RETURNING id INTO v_run_id;

    RETURN jsonb_build_object(
        'success', true,
        'run_id', v_run_id,
        'points_earned', 0,
        'status', v_status,
        'reason', v_reason,
        'distance_km', ROUND((v_distance_meters / 1000.0)::numeric, 2)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Restore partner coupon redemption RPC (server-side FIFO consume)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.redeem_partner_coupon(
    p_user_id UUID,
    p_coupon_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_coupon RECORD;
    v_user_points INTEGER;
    v_redemption_id UUID;
    v_unique_code TEXT;
    v_consumed BOOLEAN;
    v_new_balance INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF auth.uid() <> p_user_id AND NOT public.is_current_user_admin() THEN
      RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
    END IF;

    SELECT * INTO v_coupon
    FROM public.partner_coupons
    WHERE id = p_coupon_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (valid_from IS NULL OR valid_from <= NOW())
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Coupon not found or expired'
        );
    END IF;

    IF v_coupon.stock_limit IS NOT NULL
       AND COALESCE(v_coupon.redeemed_count, 0) >= v_coupon.stock_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Coupon out of stock'
        );
    END IF;

    v_user_points := public.get_user_active_points(p_user_id);

    IF v_user_points < v_coupon.points_required THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient points',
            'required', v_coupon.points_required,
            'available', v_user_points
        );
    END IF;

    v_consumed := public.consume_points_fifo(p_user_id, v_coupon.points_required);
    IF v_consumed IS DISTINCT FROM TRUE THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient points'
        );
    END IF;

    v_unique_code := v_coupon.code || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8);

    INSERT INTO public.user_coupon_redemptions (user_id, coupon_id, code_used, points_spent)
    VALUES (p_user_id, p_coupon_id, v_unique_code, v_coupon.points_required)
    RETURNING id INTO v_redemption_id;

    UPDATE public.partner_coupons
    SET redeemed_count = COALESCE(redeemed_count, 0) + 1,
        updated_at = NOW()
    WHERE id = p_coupon_id;

    v_new_balance := public.get_user_active_points(p_user_id);

    RETURN jsonb_build_object(
        'success', true,
        'redemption_id', v_redemption_id,
        'code', v_unique_code,
        'new_points_balance', v_new_balance,
        'coupon', jsonb_build_object(
            'title', v_coupon.title,
            'partner', v_coupon.partner,
            'description', v_coupon.description
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
