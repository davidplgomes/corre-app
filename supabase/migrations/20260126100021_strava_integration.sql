-- =====================================================
-- STRAVA INTEGRATION SYSTEM
-- Execute this in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Strava OAuth tokens (encrypted with pgcrypto)
-- Ensure pgcrypto is enabled (it should be from previous migration, but good to be safe)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.strava_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    strava_athlete_id BIGINT NOT NULL UNIQUE,
    access_token TEXT NOT NULL, -- In production, encrypt this!
    refresh_token TEXT NOT NULL, -- In production, encrypt this!
    expires_at TIMESTAMPTZ NOT NULL,
    scope TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_strava_conn_user ON public.strava_connections(user_id);

-- RLS
ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strava connection" ON public.strava_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update own strava connection" ON public.strava_connections
    FOR ALL USING (auth.uid() = user_id);

-- 2. Strava activities synced via webhook or manual fetch
CREATE TABLE IF NOT EXISTS public.strava_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    strava_id BIGINT NOT NULL UNIQUE,
    activity_type TEXT NOT NULL, -- 'Run', 'Ride', 'Walk'
    name TEXT,
    distance_meters DECIMAL(10,2),
    moving_time_seconds INTEGER,
    elapsed_time_seconds INTEGER,
    total_elevation_gain DECIMAL(8,2),
    start_date TIMESTAMPTZ,
    average_speed DECIMAL(6,2),
    max_speed DECIMAL(6,2),
    average_heartrate DECIMAL(5,2),
    map_polyline TEXT, -- Encoded polyline for map display
    points_earned INTEGER DEFAULT 0,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_strava_act_user ON public.strava_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_strava_act_date ON public.strava_activities(start_date DESC);

-- RLS
ALTER TABLE public.strava_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strava activities" ON public.strava_activities
    FOR SELECT USING (auth.uid() = user_id);

-- Also allow everyone to view activities if profile is public (logic handled in app usually, but we can be permissive for feed)
CREATE POLICY "Public activities are viewable" ON public.strava_activities
    FOR SELECT USING (true); -- Or refine based on user privacy settings

-- 3. Aggregated stats view for performance
CREATE OR REPLACE VIEW public.user_strava_stats AS
SELECT 
    user_id,
    COUNT(*) as total_activities,
    SUM(distance_meters) / 1000 as total_km,
    AVG(moving_time_seconds / NULLIF(distance_meters / 1000, 0)) as avg_pace_seconds_per_km,
    SUM(total_elevation_gain) as total_elevation,
    MAX(distance_meters) / 1000 as longest_run_km
FROM public.strava_activities
WHERE activity_type = 'Run'
GROUP BY user_id;

-- 4. Function to upsert strava token (helper)
CREATE OR REPLACE FUNCTION upsert_strava_connection(
    p_user_id UUID,
    p_athlete_id BIGINT,
    p_access_token TEXT,
    p_refresh_token TEXT,
    p_expires_at TIMESTAMPTZ,
    p_scope TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.strava_connections (
        user_id, strava_athlete_id, access_token, refresh_token, expires_at, scope, updated_at
    ) VALUES (
        p_user_id, p_athlete_id, p_access_token, p_refresh_token, p_expires_at, p_scope, NOW()
    )
    ON CONFLICT (strava_athlete_id) 
    DO UPDATE SET 
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        scope = EXCLUDED.scope,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
