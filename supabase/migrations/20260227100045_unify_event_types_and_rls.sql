-- =====================================================
-- Sprint 1: Unify event types + add partner/admin RLS
-- The web was inserting event_type values ('run', 'group_run',
-- 'coffee_run', 'social') that violated the DB constraint
-- which only allowed ('routine', 'special', 'race').
-- This migration expands the constraint to cover both sets.
-- =====================================================

-- ─── 1. Fix event_type constraint ─────────────────────────

-- Drop the unnamed check constraint on events.event_type
DO $$
DECLARE
    v_constraint TEXT;
BEGIN
    FOR v_constraint IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'events'
          AND att.attname = 'event_type'
          AND con.contype = 'c'
    LOOP
        EXECUTE format('ALTER TABLE public.events DROP CONSTRAINT IF EXISTS %I', v_constraint);
        RAISE NOTICE 'Dropped events.event_type constraint: %', v_constraint;
    END LOOP;
END $$;

-- Add unified constraint covering mobile types + web types
ALTER TABLE public.events
ADD CONSTRAINT events_event_type_check
    CHECK (event_type IN (
        -- Mobile / points-system types
        'routine',      -- Regular training run (base points)
        'special',      -- Special community event (bonus points)
        'race',         -- Official race (max points)
        -- Web / descriptive types (treated as special by mobile)
        'group_run',    -- Group run session
        'coffee_run',   -- Coffee + run social
        'social'        -- Social gathering / non-running event
    ));

COMMENT ON CONSTRAINT events_event_type_check ON public.events IS
    'Unified event types: routine/special/race for mobile points; group_run/coffee_run/social for web richness.';

-- ─── 2. Add RLS policies for events ───────────────────────

-- Existing policies (from initial schema) only cover public read.
-- We need partner write and admin full access.

-- Partners can create events (they become the creator)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'events'
          AND policyname = 'Partners can create events'
    ) THEN
        CREATE POLICY "Partners can create events"
            ON public.events FOR INSERT
            WITH CHECK (
                creator_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM public.users
                    WHERE id = auth.uid()
                      AND role IN ('partner', 'admin')
                )
            );
    END IF;
END $$;

-- Partners can update their own events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'events'
          AND policyname = 'Partners can update own events'
    ) THEN
        CREATE POLICY "Partners can update own events"
            ON public.events FOR UPDATE
            USING (creator_id = auth.uid());
    END IF;
END $$;

-- Partners can delete their own events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'events'
          AND policyname = 'Partners can delete own events'
    ) THEN
        CREATE POLICY "Partners can delete own events"
            ON public.events FOR DELETE
            USING (creator_id = auth.uid());
    END IF;
END $$;

-- Admins have full access to all events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'events'
          AND policyname = 'Admins can manage all events'
    ) THEN
        CREATE POLICY "Admins can manage all events"
            ON public.events FOR ALL
            USING (
                EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
            );
    END IF;
END $$;

-- Service role bypass
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'events'
          AND policyname = 'Service role full access on events'
    ) THEN
        CREATE POLICY "Service role full access on events"
            ON public.events FOR ALL
            USING (auth.role() = 'service_role');
    END IF;
END $$;

-- ─── 3. Ensure events table has RLS enabled ────────────────

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ─── 4. Add admin read policy on users (for web dashboard) ─

-- Admins need to read all users (user management page)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'users'
          AND policyname = 'Admins can view all users'
    ) THEN
        CREATE POLICY "Admins can view all users"
            ON public.users FOR SELECT
            USING (
                EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
            );
    END IF;
END $$;

-- Admins need to update users (role changes)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'users'
          AND policyname = 'Admins can update all users'
    ) THEN
        CREATE POLICY "Admins can update all users"
            ON public.users FOR UPDATE
            USING (
                EXISTS (SELECT 1 FROM public.users u2 WHERE u2.id = auth.uid() AND u2.role = 'admin')
            );
    END IF;
END $$;

-- Admins need to delete users (user management page)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'users'
          AND policyname = 'Admins can delete users'
    ) THEN
        CREATE POLICY "Admins can delete users"
            ON public.users FOR DELETE
            USING (
                EXISTS (SELECT 1 FROM public.users u2 WHERE u2.id = auth.uid() AND u2.role = 'admin')
            );
    END IF;
END $$;

-- Service role bypass on users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'users'
          AND policyname = 'Service role full access on users'
    ) THEN
        CREATE POLICY "Service role full access on users"
            ON public.users FOR ALL
            USING (auth.role() = 'service_role');
    END IF;
END $$;
