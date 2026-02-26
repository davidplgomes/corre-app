-- =====================================================
-- ADD START COORDINATES TO STRAVA ACTIVITIES
-- For fallback map centering when no polyline is available
-- =====================================================

ALTER TABLE public.strava_activities
ADD COLUMN IF NOT EXISTS start_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS start_lng DOUBLE PRECISION;

COMMENT ON COLUMN public.strava_activities.start_lat IS 'Starting latitude of the activity';
COMMENT ON COLUMN public.strava_activities.start_lng IS 'Starting longitude of the activity';
