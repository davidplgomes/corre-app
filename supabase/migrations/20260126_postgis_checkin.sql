-- =====================================================
-- POSTGIS CHECK-IN ENHANCEMENT
-- Execute this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add geography column to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS location_geo GEOGRAPHY(POINT, 4326);

-- 3. Backfill existing events with geography data
UPDATE public.events 
SET location_geo = ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326)
WHERE location_geo IS NULL AND location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- 4. Trigger to auto-populate geography on insert/update
CREATE OR REPLACE FUNCTION update_event_geography()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
        NEW.location_geo := ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_geo ON public.events;
CREATE TRIGGER trg_event_geo 
    BEFORE INSERT OR UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_event_geography();

-- 5. Enhanced check-in validation with PostGIS (more secure than client-side)
-- DROP OLD FUNCTION FIRST to avoid parameter name conflict errors (42P13)
DROP FUNCTION IF EXISTS validate_and_create_checkin(uuid, uuid, double precision, double precision);

CREATE OR REPLACE FUNCTION validate_and_create_checkin(
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
BEGIN
    -- Get event
    SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Event not found');
    END IF;
    
    -- Create user location point
    v_user_location := ST_SetSRID(ST_MakePoint(p_check_in_lng, p_check_in_lat), 4326);
    
    -- Calculate distance using PostGIS (returns meters)
    -- This is calculated on the SERVER, not client - prevents location spoofing
    v_distance := ST_Distance(v_user_location, v_event.location_geo);
    
    -- Validate distance (check_in_radius_meters from event, default 300)
    IF v_distance > COALESCE(v_event.check_in_radius_meters, 300) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error_message', 'Too far from event location',
            'distance_meters', ROUND(v_distance::NUMERIC, 2)
        );
    END IF;
    
    -- Validate time window (30 min before/after event start)
    IF NOT (NOW() BETWEEN v_event.event_datetime - INTERVAL '30 minutes' 
            AND v_event.event_datetime + INTERVAL '30 minutes') THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error_message', 'Outside check-in time window'
        );
    END IF;
    
    -- Check for existing check-in
    IF EXISTS (SELECT 1 FROM public.check_ins WHERE event_id = p_event_id AND user_id = p_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error_message', 'Already checked in');
    END IF;
    
    -- Determine points based on event type
    v_points := CASE v_event.event_type
        WHEN 'routine' THEN 3
        WHEN 'special' THEN 5
        WHEN 'race' THEN 10
        ELSE 1
    END;
    
    -- Create check-in record
    INSERT INTO public.check_ins (event_id, user_id, points_earned, check_in_lat, check_in_lng)
    VALUES (p_event_id, p_user_id, v_points, p_check_in_lat, p_check_in_lng)
    RETURNING id INTO v_check_in_id;
    
    -- Update user points (trigger should handle this, but explicit for safety)
    UPDATE public.users
    SET current_month_points = current_month_points + v_points,
        total_lifetime_points = total_lifetime_points + v_points
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'check_in_id', v_check_in_id,
        'points_earned', v_points,
        'distance_meters', ROUND(v_distance::NUMERIC, 2)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create index for spatial queries
CREATE INDEX IF NOT EXISTS idx_events_location_geo ON public.events USING GIST (location_geo);
