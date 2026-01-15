-- Corre App - Database Functions and Triggers
-- This migration creates all necessary functions and triggers

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to calculate distance between two lat/lng coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  r DOUBLE PRECISION := 6371000; -- Earth radius in meters
  dlat DOUBLE PRECISION;
  dlng DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlng/2) * sin(dlng/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- CHECK-IN VALIDATION FUNCTION
-- ============================================================================

-- RPC function to validate and create check-in
CREATE OR REPLACE FUNCTION public.validate_and_create_checkin(
  p_event_id UUID,
  p_user_id UUID, 
  p_user_lat DOUBLE PRECISION,
  p_user_lng DOUBLE PRECISION
) RETURNS JSONB AS $$
DECLARE
  v_event RECORD;
  v_distance DOUBLE PRECISION;
  v_time_diff INTERVAL;
  v_checkin_id UUID;
  v_already_checked_in BOOLEAN;
BEGIN
  -- Check if user already checked in
  SELECT EXISTS(
    SELECT 1 FROM public.check_ins
    WHERE event_id = p_event_id AND user_id = p_user_id
  ) INTO v_already_checked_in;

  IF v_already_checked_in THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Already checked in to this event',
      'code', 'ALREADY_CHECKED_IN'
    );
  END IF;

  -- Get event details
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;

  IF v_event IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Event not found',
      'code', 'EVENT_NOT_FOUND'
    );
  END IF;

  -- Calculate distance
  v_distance := public.calculate_distance(
    p_user_lat, p_user_lng,
    v_event.location_lat, v_event.location_lng
  );

  -- Validate distance
  IF v_distance > v_event.check_in_radius_meters THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You are too far from the event location',
      'code', 'TOO_FAR',
      'distance', v_distance,
      'max_distance', v_event.check_in_radius_meters
    );
  END IF;

  -- Validate time window (30 minutes before to 30 minutes after event time)
  v_time_diff := NOW() - v_event.event_datetime;
  IF v_time_diff < INTERVAL '-30 minutes' OR v_time_diff > INTERVAL '30 minutes' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Check-in window has closed',
      'code', 'OUTSIDE_TIME_WINDOW',
      'event_time', v_event.event_datetime,
      'current_time', NOW()
    );
  END IF;

  -- Create check-in
  INSERT INTO public.check_ins (
    event_id,
    user_id,
    check_in_lat,
    check_in_lng,
    points_earned
  ) VALUES (
    p_event_id,
    p_user_id,
    p_user_lat,
    p_user_lng,
    v_event.points_value
  ) RETURNING id INTO v_checkin_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'checkin_id', v_checkin_id,
    'points_earned', v_event.points_value,
    'distance', v_distance
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', 'UNKNOWN_ERROR'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- POINTS MANAGEMENT FUNCTIONS
-- ============================================================================

-- Trigger function to update user points after check-in
CREATE OR REPLACE FUNCTION public.update_user_points()
RETURNS TRIGGER AS $$
DECLARE
  v_current_month DATE;
BEGIN
  v_current_month := DATE_TRUNC('month', NEW.checked_in_at)::DATE;

  -- Update user's current month points and total points
  UPDATE public.users
  SET
    current_month_points = current_month_points + NEW.points_earned,
    total_lifetime_points = total_lifetime_points + NEW.points_earned,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  -- Update or insert into monthly leaderboard
  INSERT INTO public.monthly_leaderboard (user_id, month, points, updated_at)
  VALUES (NEW.user_id, v_current_month, NEW.points_earned, NOW())
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    points = public.monthly_leaderboard.points + NEW.points_earned,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating points after check-in
DROP TRIGGER IF EXISTS trigger_update_points ON public.check_ins;
CREATE TRIGGER trigger_update_points
AFTER INSERT ON public.check_ins
FOR EACH ROW
EXECUTE FUNCTION public.update_user_points();

-- ============================================================================
-- MEMBERSHIP TIER MANAGEMENT
-- ============================================================================

-- Trigger function to upgrade tier based on points
CREATE OR REPLACE FUNCTION public.update_membership_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- If user reaches 12+ points in a month and is on free tier, upgrade to basico
  IF NEW.current_month_points >= 12 AND NEW.membership_tier = 'free' THEN
    NEW.membership_tier := 'basico';
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tier upgrades
DROP TRIGGER IF EXISTS trigger_update_tier ON public.users;
CREATE TRIGGER trigger_update_tier
BEFORE UPDATE ON public.users
FOR EACH ROW
WHEN (OLD.current_month_points IS DISTINCT FROM NEW.current_month_points)
EXECUTE FUNCTION public.update_membership_tier();

-- ============================================================================
-- LEADERBOARD RANKING FUNCTION
-- ============================================================================

-- Function to update leaderboard rankings for a given month
CREATE OR REPLACE FUNCTION public.update_leaderboard_rankings(p_month DATE)
RETURNS void AS $$
BEGIN
  -- Update rankings using window function
  WITH ranked AS (
    SELECT
      id,
      RANK() OVER (ORDER BY points DESC) as new_rank
    FROM public.monthly_leaderboard
    WHERE month = p_month
  )
  UPDATE public.monthly_leaderboard
  SET rank = ranked.new_rank, updated_at = NOW()
  FROM ranked
  WHERE public.monthly_leaderboard.id = ranked.id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rankings after leaderboard changes
CREATE OR REPLACE FUNCTION public.trigger_update_leaderboard_rankings()
RETURNS TRIGGER AS $$
BEGIN
  -- Update rankings for the affected month
  PERFORM public.update_leaderboard_rankings(NEW.month);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leaderboard_rankings ON public.monthly_leaderboard;
CREATE TRIGGER trigger_leaderboard_rankings
AFTER INSERT OR UPDATE ON public.monthly_leaderboard
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_leaderboard_rankings();

-- ============================================================================
-- MONTHLY RESET FUNCTION
-- ============================================================================

-- Function to reset monthly points (to be called by cron job)
CREATE OR REPLACE FUNCTION public.reset_monthly_points()
RETURNS void AS $$
BEGIN
  -- Reset current month points for all users
  UPDATE public.users
  SET
    current_month_points = 0,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USER CREATION TRIGGER
-- ============================================================================

-- Function to create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_qr_secret TEXT;
BEGIN
  -- Generate unique QR code secret
  v_qr_secret := encode(gen_random_bytes(16), 'hex');

  -- Ensure uniqueness
  WHILE EXISTS(SELECT 1 FROM public.users WHERE qr_code_secret = v_qr_secret) LOOP
    v_qr_secret := encode(gen_random_bytes(16), 'hex');
  END LOOP;

  -- Insert user profile
  INSERT INTO public.users (
    id,
    email,
    full_name,
    neighborhood,
    qr_code_secret,
    language_preference
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'neighborhood',
    v_qr_secret,
    COALESCE(NEW.raw_user_meta_data->>'language_preference', 'en')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- HELPER FUNCTIONS FOR API
-- ============================================================================

-- Function to get current month leaderboard with user info
CREATE OR REPLACE FUNCTION public.get_current_month_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  rank INTEGER,
  user_id UUID,
  full_name TEXT,
  membership_tier TEXT,
  points INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.rank::INTEGER,
    l.user_id,
    u.full_name,
    u.membership_tier,
    l.points
  FROM public.monthly_leaderboard l
  JOIN public.users u ON l.user_id = u.id
  WHERE l.month = DATE_TRUNC('month', NOW())::DATE
  ORDER BY l.rank
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add comments to functions
COMMENT ON FUNCTION public.calculate_distance IS 'Calculate distance in meters between two lat/lng points using Haversine formula';
COMMENT ON FUNCTION public.validate_and_create_checkin IS 'Validate user location and time, then create check-in record';
COMMENT ON FUNCTION public.update_user_points IS 'Trigger function to update user points after check-in';
COMMENT ON FUNCTION public.update_membership_tier IS 'Trigger function to upgrade user tier when reaching 12 points';
COMMENT ON FUNCTION public.reset_monthly_points IS 'Reset all users monthly points (run via cron on 1st of month)';
COMMENT ON FUNCTION public.handle_new_user IS 'Create user profile when new auth user is registered';
COMMENT ON FUNCTION public.get_current_month_leaderboard IS 'Get current month leaderboard with user details';
