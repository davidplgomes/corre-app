-- =====================================================
-- SECURE RUN SYSTEM (ANTI-FRAUD)
-- Execute this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Enable PostGIS (should already be enabled, but ensure it)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add verification fields to runs table
ALTER TABLE public.runs 
ADD COLUMN IF NOT EXISTS step_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'flagged'
ADD COLUMN IF NOT EXISTS verification_reason TEXT,
ADD COLUMN IF NOT EXISTS max_speed_kmh DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS avg_speed_kmh DECIMAL(10,2);

-- 3. Create RPC to submit and verify run server-side
CREATE OR REPLACE FUNCTION submit_secure_run(
    p_user_id UUID,
    p_started_at TIMESTAMPTZ,
    p_ended_at TIMESTAMPTZ,
    p_route_data JSONB, -- Array of {lat, lng, timestamp}
    p_step_count INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_run_id UUID;
    v_distance_meters DOUBLE PRECISION := 0;
    v_duration_seconds INTEGER;
    v_avg_speed_kmh DECIMAL(10,2);
    v_max_speed_kmh DECIMAL(10,2) := 0;
    v_status TEXT := 'verified';
    v_reason TEXT := NULL;
    v_points INTEGER := 0;
    v_route_geom GEOMETRY;
    v_last_point GEOMETRY;
    v_curr_point GEOMETRY;
    v_point_record JSONB;
    v_points_array GEOMETRY[];
    v_idx INTEGER;
BEGIN
    -- Calculate duration
    v_duration_seconds := EXTRACT(EPOCH FROM (p_ended_at - p_started_at));
    
    IF v_duration_seconds <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid duration');
    END IF;

    -- Reconstruct Route & Calculate Distance (Server-Side Physics)
    -- We'll process the JSON route data to build a Linestring and calculate true distance
    
    -- Note: For very long arrays, passing huge JSONB to PL/PGSQL can be heavy. 
    -- In production, might want to just accept client distance if signed, 
    -- but for Anti-Fraud, we must validate at least a sample or the total length.
    
    -- Simplified server-side distance calc (sum of segments)
    -- Also check max speed between segments
    
    -- Initialize variables
    v_distance_meters := 0;
    
    -- Loop through points to build geometry and calc stats
    -- This logic assumes p_route_data is ordered by timestamp
    
    IF jsonb_array_length(p_route_data) < 2 THEN
        v_distance_meters := 0;
    ELSE
        -- Construct LINESTRING from points
        -- Extract points into an array of geometries
        SELECT array_agg(ST_SetSRID(ST_MakePoint((x->>'lng')::float, (x->>'lat')::float), 4326))
        INTO v_points_array
        FROM jsonb_array_elements(p_route_data) x;
        
        -- Create LineString
        v_route_geom := ST_MakeLine(v_points_array);
        
        -- Calculate Geodetic Length (in meters)
        v_distance_meters := ST_Length(v_route_geom::geography);
        
        -- Calculate Max Speed (Rough approximation from total distance/time for MVP, 
        -- or could iterate segments for precision if needed)
    END IF;

    -- Calculate Average Speed
    IF v_duration_seconds > 0 THEN
        v_avg_speed_kmh := (v_distance_meters / 1000.0) / (v_duration_seconds / 3600.0);
    ELSE
        v_avg_speed_kmh := 0;
    END IF;

    -- Anti-Fraud Rule 1: Human Speed Limit (World Record Marathon Pace ~21km/h, Sprint ~45km/h)
    -- We set a generous limit of 35km/h avg for "Run" activity to catch cars
    IF v_avg_speed_kmh > 35 THEN
        v_status := 'flagged';
        v_reason := 'Speed too high (' || ROUND(v_avg_speed_kmh, 1) || ' km/h). Likely vehicle.';
    END IF;

    -- Anti-Fraud Rule 2: Step Cadence Check
    -- Runners typically take 150-180 steps per min. 
    -- Less than 50 steps/km (stride length 20m) is impossible for a runner (bike/car).
    -- Only apply if distance > 500m (short runs might be weird)
    IF v_distance_meters > 500 AND p_step_count < (v_distance_meters / 20) THEN 
        -- Stride of 20 meters is impossible. Verified stride usually < 2m.
        -- So steps should be > distance/2 at minimum.
        v_status := 'flagged';
        v_reason := 'Step count too low for distance. Likely bike or vehicle.';
    END IF;

    -- Calculate Points (Only if verified)
    IF v_status = 'verified' THEN
        v_points := calculate_run_points(v_distance_meters / 1000.0);
    ELSE
        v_points := 0; -- No points for flagged runs
    END IF;

    -- Insert Run Record
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
        v_points,
        p_route_data,
        p_started_at,
        p_ended_at,
        v_status,
        v_reason,
        v_avg_speed_kmh
    ) RETURNING id INTO v_run_id;

    -- If verified, trigger will handle points update to user profile
    -- But since we calculate points manually here to prevent 'flagged' runs from getting points,
    -- we need to ensure the standard trigger doesn't double count or count flagged runs.
    
    -- IMPORTANT: We need to modify the existing trigger or rely on this RPC.
    -- Option: Disable the standard trigger and do it here.
    
    IF v_status = 'verified' THEN
        UPDATE public.users
        SET current_month_points = current_month_points + v_points,
            total_lifetime_points = total_lifetime_points + v_points
        WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'run_id', v_run_id,
        'points_earned', v_points,
        'status', v_status,
        'reason', v_reason,
        'distance_km', ROUND((v_distance_meters / 1000.0)::numeric, 2)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Disable the old trigger to prevent double counting/conflicts if we use this RPC
DROP TRIGGER IF EXISTS trg_run_points ON public.runs;
-- We are manually handling points in RPC for security control
