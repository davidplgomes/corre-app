-- Add columns for athlete name and profile picture to strava_connections
ALTER TABLE public.strava_connections 
ADD COLUMN IF NOT EXISTS athlete_name TEXT,
ADD COLUMN IF NOT EXISTS athlete_profile_picture TEXT;
