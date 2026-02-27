-- =====================================================
-- STRAVA OAUTH STATE HARDENING
-- One-time, expiring state tokens to prevent account-link tampering.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.strava_oauth_states (
    state TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
    used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_strava_oauth_states_user_id
    ON public.strava_oauth_states(user_id);

CREATE INDEX IF NOT EXISTS idx_strava_oauth_states_expires_at
    ON public.strava_oauth_states(expires_at);

ALTER TABLE public.strava_oauth_states ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'strava_oauth_states'
          AND policyname = 'Users can insert own strava oauth states'
    ) THEN
        CREATE POLICY "Users can insert own strava oauth states"
            ON public.strava_oauth_states
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'strava_oauth_states'
          AND policyname = 'Users can view own strava oauth states'
    ) THEN
        CREATE POLICY "Users can view own strava oauth states"
            ON public.strava_oauth_states
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END
$$;

COMMENT ON TABLE public.strava_oauth_states IS
    'Temporary one-time OAuth state values for Strava authorization callbacks';
