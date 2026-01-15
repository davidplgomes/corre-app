-- Corre App - Row Level Security Policies
-- This migration sets up RLS policies for all tables

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Merchants can view user info when scanning QR
CREATE POLICY "Merchants can view user tiers by QR"
  ON public.users FOR SELECT
  USING (
    is_merchant = TRUE
    OR auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_merchant = TRUE
    )
  );

-- Users can view other user profiles (for leaderboard, participants list)
CREATE POLICY "Users can view other profiles"
  ON public.users FOR SELECT
  USING (true);

-- ============================================================================
-- EVENTS TABLE POLICIES
-- ============================================================================

-- Anyone can view events (including unauthenticated users for browsing)
CREATE POLICY "Anyone can view events"
  ON public.events FOR SELECT
  USING (true);

-- Authenticated users can create events
CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = creator_id AND auth.uid() IS NOT NULL);

-- Only creators can update their events
CREATE POLICY "Creators can update own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Only creators can delete their events
CREATE POLICY "Creators can delete own events"
  ON public.events FOR DELETE
  USING (auth.uid() = creator_id);

-- ============================================================================
-- EVENT_PARTICIPANTS TABLE POLICIES
-- ============================================================================

-- Users can view participants of any event
CREATE POLICY "Users can view event participants"
  ON public.event_participants FOR SELECT
  USING (true);

-- Users can join events (add themselves as participants)
CREATE POLICY "Users can join events"
  ON public.event_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Users can leave events (remove themselves as participants)
CREATE POLICY "Users can leave events"
  ON public.event_participants FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CHECK_INS TABLE POLICIES
-- ============================================================================

-- Users can view their own check-ins
CREATE POLICY "Users can view own check-ins"
  ON public.check_ins FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view check-ins for events they're participating in
CREATE POLICY "Users can view event check-ins"
  ON public.check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_participants
      WHERE event_participants.event_id = check_ins.event_id
      AND event_participants.user_id = auth.uid()
    )
  );

-- Users can create check-ins for themselves
CREATE POLICY "Users can create check-ins"
  ON public.check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- No updates or deletes allowed on check-ins (immutable)

-- ============================================================================
-- MONTHLY_LEADERBOARD TABLE POLICIES
-- ============================================================================

-- Everyone can view the leaderboard
CREATE POLICY "Anyone can view leaderboard"
  ON public.monthly_leaderboard FOR SELECT
  USING (true);

-- Only system (via triggers) can insert/update leaderboard
-- No direct INSERT/UPDATE/DELETE policies for users

-- ============================================================================
-- NEIGHBORHOODS TABLE POLICIES
-- ============================================================================

-- Everyone can view neighborhoods
CREATE POLICY "Anyone can view neighborhoods"
  ON public.neighborhoods FOR SELECT
  USING (true);

-- Only authenticated users can suggest new neighborhoods
CREATE POLICY "Authenticated users can add neighborhoods"
  ON public.neighborhoods FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add comments
COMMENT ON POLICY "Users can view own profile" ON public.users IS 'Users can read their own profile data';
COMMENT ON POLICY "Anyone can view events" ON public.events IS 'Public can browse events without authentication';
COMMENT ON POLICY "Users can join events" ON public.event_participants IS 'Authenticated users can join any event';
COMMENT ON POLICY "Users can create check-ins" ON public.check_ins IS 'Users can check in to events they are participating in';
COMMENT ON POLICY "Anyone can view leaderboard" ON public.monthly_leaderboard IS 'Leaderboard is publicly visible';
