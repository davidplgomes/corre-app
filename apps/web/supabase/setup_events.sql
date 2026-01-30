-- Create events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    max_participants INTEGER DEFAULT 100,
    current_participants INTEGER DEFAULT 0,
    status TEXT DEFAULT 'upcoming', -- 'upcoming', 'live', 'completed', 'cancelled'
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Allow public read access to events
CREATE POLICY "Events are viewable by everyone" ON public.events
    FOR SELECT USING (true);

-- Allow admins (or anyone for now if role checking is complex) to maintain events
-- Ideally check for role = 'admin'
CREATE POLICY "Admins can manage events" ON public.events
    FOR ALL USING (true);

-- Seed some initial real-looking data
INSERT INTO public.events (name, description, date, location, current_participants, status)
VALUES 
    ('Night Run Dublin', 'Weekly community night run', NOW() + interval '2 days', 'Phoenix Park', 45, 'upcoming'),
    ('Morning 5k', 'Sunrise run via Sandymout', NOW() + interval '5 days', 'Sandymount', 12, 'upcoming'),
    ('Marathon Training', 'Long run for marathon prep', NOW() + interval '1 week', 'St. Stephens Green', 80, 'upcoming');
