-- Corre App - Initial Database Schema
-- This migration creates all the necessary tables for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable extensions for geospatial calculations (required for ll_to_earth)
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";

-- Create neighborhoods reference table
CREATE TABLE IF NOT EXISTS public.neighborhoods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  city TEXT DEFAULT 'Porto',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  neighborhood TEXT,
  membership_tier TEXT DEFAULT 'free' CHECK (membership_tier IN ('free', 'basico', 'baixa_pace', 'parceiros')),
  current_month_points INTEGER DEFAULT 0 CHECK (current_month_points >= 0),
  total_lifetime_points INTEGER DEFAULT 0 CHECK (total_lifetime_points >= 0),
  language_preference TEXT DEFAULT 'en' CHECK (language_preference IN ('en', 'pt', 'es')),
  qr_code_secret TEXT UNIQUE NOT NULL,
  is_merchant BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_qr_code ON public.users(qr_code_secret);
CREATE INDEX IF NOT EXISTS idx_users_tier ON public.users(membership_tier);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('routine', 'special', 'race')),
  points_value INTEGER NOT NULL CHECK (points_value > 0),
  event_datetime TIMESTAMPTZ NOT NULL,
  location_lat DOUBLE PRECISION NOT NULL CHECK (location_lat >= -90 AND location_lat <= 90),
  location_lng DOUBLE PRECISION NOT NULL CHECK (location_lng >= -180 AND location_lng <= 180),
  location_name TEXT,
  check_in_radius_meters INTEGER DEFAULT 300 CHECK (check_in_radius_meters > 0),
  creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_datetime ON public.events(event_datetime);
CREATE INDEX IF NOT EXISTS idx_events_creator ON public.events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_location ON public.events USING gist(ll_to_earth(location_lat, location_lng));

-- Create event_participants table
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create indexes for event_participants table
CREATE INDEX IF NOT EXISTS idx_participants_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.event_participants(user_id);

-- Create check_ins table
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  check_in_lat DOUBLE PRECISION NOT NULL CHECK (check_in_lat >= -90 AND check_in_lat <= 90),
  check_in_lng DOUBLE PRECISION NOT NULL CHECK (check_in_lng >= -180 AND check_in_lng <= 180),
  points_earned INTEGER NOT NULL CHECK (points_earned > 0),
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create indexes for check_ins table
CREATE INDEX IF NOT EXISTS idx_checkins_event ON public.check_ins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON public.check_ins(checked_in_at);

-- Create monthly_leaderboard table
CREATE TABLE IF NOT EXISTS public.monthly_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Create indexes for monthly_leaderboard table
CREATE INDEX IF NOT EXISTS idx_leaderboard_month ON public.monthly_leaderboard(month, points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON public.monthly_leaderboard(user_id);

-- Insert some default neighborhoods
INSERT INTO public.neighborhoods (name, city) VALUES
  ('Baixa', 'Porto'),
  ('Ribeira', 'Porto'),
  ('Cedofeita', 'Porto'),
  ('Miragaia', 'Porto'),
  ('Massarelos', 'Porto'),
  ('Bonfim', 'Porto'),
  ('Campanhã', 'Porto'),
  ('Paranhos', 'Porto'),
  ('Ramalde', 'Porto'),
  ('Lordelo do Ouro', 'Porto'),
  ('Foz do Douro', 'Porto'),
  ('Aldoar', 'Porto'),
  ('Other', 'Porto')
ON CONFLICT (name) DO NOTHING;

-- Add comment to tables
COMMENT ON TABLE public.users IS 'User profiles with membership tiers and points';
COMMENT ON TABLE public.events IS 'Running events with check-in locations';
COMMENT ON TABLE public.event_participants IS 'Users who have joined events';
COMMENT ON TABLE public.check_ins IS 'User check-ins at events with points';
COMMENT ON TABLE public.monthly_leaderboard IS 'Monthly points leaderboard';
COMMENT ON TABLE public.neighborhoods IS 'Available neighborhoods for user selection';
