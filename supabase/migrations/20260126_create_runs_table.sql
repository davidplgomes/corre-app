-- =====================================================
-- RUNS TABLE MIGRATION
-- Execute this in Supabase Dashboard > SQL Editor
-- =====================================================

-- Create runs table for tracking user runs with GPS data
CREATE TABLE IF NOT EXISTS public.runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    distance_km DECIMAL(6,2) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    pace_per_km INTEGER GENERATED ALWAYS AS (
        CASE WHEN distance_km > 0 
        THEN (duration_seconds / distance_km)::INTEGER 
        ELSE NULL END
    ) STORED,
    points_earned INTEGER NOT NULL DEFAULT 0,
    route_data JSONB, -- GPS coordinates: [{lat, lng, timestamp}, ...]
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_runs_user_created ON public.runs(user_id, created_at DESC);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_runs_points ON public.runs(created_at DESC, points_earned DESC);

-- Enable RLS
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own runs" ON public.runs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own runs" ON public.runs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view others runs" ON public.runs
    FOR SELECT USING (true);

-- Function to calculate points based on distance
CREATE OR REPLACE FUNCTION calculate_run_points(distance_km DECIMAL)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE
        WHEN distance_km >= 21 THEN 15
        WHEN distance_km >= 10 THEN 10
        WHEN distance_km >= 5 THEN 5
        WHEN distance_km >= 2 THEN 3
        ELSE 1
    END;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to award points on run creation
CREATE OR REPLACE FUNCTION award_run_points()
RETURNS TRIGGER AS $$
DECLARE
    pts INTEGER;
BEGIN
    pts := calculate_run_points(NEW.distance_km);
    NEW.points_earned := pts;
    
    -- Update user's monthly and lifetime points
    UPDATE public.users
    SET current_month_points = current_month_points + pts,
        total_lifetime_points = total_lifetime_points + pts
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_run_points ON public.runs;
CREATE TRIGGER trg_run_points
    BEFORE INSERT ON public.runs
    FOR EACH ROW EXECUTE FUNCTION award_run_points();
