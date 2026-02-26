-- =====================================================
-- STRAVA API COMPLIANCE & GAMIFICATION INTEGRATION
-- Adds 7-day data retention, points awarding, and cleanup
-- =====================================================

-- ─── 1. Schema Changes to strava_activities ──────────────────────────────────

-- Add compliance tracking column (7-day cache limit per Strava API terms)
ALTER TABLE public.strava_activities
ADD COLUMN IF NOT EXISTS cached_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');

-- Add gamification tracking columns
ALTER TABLE public.strava_activities
ADD COLUMN IF NOT EXISTS points_awarded BOOLEAN DEFAULT FALSE;

ALTER TABLE public.strava_activities
ADD COLUMN IF NOT EXISTS points_transaction_id UUID;

-- ─── 2. Indexes for Performance ──────────────────────────────────────────────

-- Index for cleanup queries (find expired cached data)
CREATE INDEX IF NOT EXISTS idx_strava_activities_cached_until
ON public.strava_activities(cached_until)
WHERE cached_until IS NOT NULL;

-- Index for finding activities pending points award
CREATE INDEX IF NOT EXISTS idx_strava_activities_pending_points
ON public.strava_activities(user_id, points_awarded)
WHERE points_awarded = FALSE;

-- ─── 3. Cleanup Function for Expired Data ────────────────────────────────────

-- Function to clean up Strava activity data older than 7 days
-- Per Strava API Agreement: "No Strava Data shall remain in your cache longer than seven days"
CREATE OR REPLACE FUNCTION cleanup_expired_strava_data()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete activities where cache has expired
    WITH deleted AS (
        DELETE FROM public.strava_activities
        WHERE cached_until < NOW()
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;

    -- Log the cleanup result
    IF v_deleted_count > 0 THEN
        RAISE NOTICE 'Strava cleanup: Deleted % expired activities', v_deleted_count;
    END IF;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_strava_data() IS
    'Daily cleanup job: removes Strava activity data older than 7 days (Strava API compliance)';

-- ─── 4. Schedule Daily Cleanup Cron Job ──────────────────────────────────────

-- Schedule daily Strava data cleanup at 3:00 AM UTC
-- Using existing pg_cron extension (enabled in 20240122_enable_pg_cron.sql)
SELECT cron.schedule(
    'strava-data-cleanup',
    '0 3 * * *',
    $$SELECT public.cleanup_expired_strava_data()$$
);

-- ─── 5. Points Award Function ────────────────────────────────────────────────

-- Function to award points for a Strava activity
-- Only awards for Run, TrailRun, VirtualRun activity types
-- Uses existing calculate_run_points scale (1-15 points based on distance)
CREATE OR REPLACE FUNCTION award_strava_activity_points(
    p_strava_activity_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
    v_activity RECORD;
    v_distance_km DECIMAL(10,2);
    v_points INTEGER;
    v_tx_id UUID;
    v_source_type TEXT;
BEGIN
    -- Get the activity
    SELECT * INTO v_activity
    FROM public.strava_activities
    WHERE strava_id = p_strava_activity_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Activity not found');
    END IF;

    -- Check if points already awarded (prevent duplicates)
    IF v_activity.points_awarded = TRUE THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Points already awarded',
            'points_transaction_id', v_activity.points_transaction_id
        );
    END IF;

    -- Only award points for running activities
    IF v_activity.activity_type NOT IN ('Run', 'TrailRun', 'VirtualRun') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Activity type not eligible for points',
            'activity_type', v_activity.activity_type
        );
    END IF;

    -- Convert meters to km
    v_distance_km := COALESCE(v_activity.distance_meters, 0) / 1000.0;

    -- Calculate points using existing function (same scale as manual runs)
    v_points := calculate_run_points(v_distance_km);

    -- Determine source type based on activity characteristics
    -- 'special' (60 day TTL) for races/challenges, 'routine' (30 day TTL) otherwise
    IF v_activity.name ILIKE '%race%'
       OR v_activity.name ILIKE '%marathon%'
       OR v_activity.name ILIKE '%corrida%'
       OR v_activity.name ILIKE '%challenge%' THEN
        v_source_type := 'special';
    ELSE
        v_source_type := 'routine';
    END IF;

    -- Award points using existing TTL system
    v_tx_id := add_points_with_ttl(
        v_activity.user_id,
        v_points,
        v_source_type,
        v_activity.id,  -- Use activity UUID as source_id for tracking
        'Strava: ' || COALESCE(v_activity.name, 'Activity') || ' (' || ROUND(v_distance_km, 2) || ' km)'
    );

    -- Update activity record to mark points as awarded
    UPDATE public.strava_activities
    SET points_awarded = TRUE,
        points_earned = v_points,
        points_transaction_id = v_tx_id
    WHERE strava_id = p_strava_activity_id;

    -- Create notification for user
    INSERT INTO public.notifications (user_id, title, body, type, data)
    VALUES (
        v_activity.user_id,
        'Strava Run Synced!',
        'You earned ' || v_points || ' points for "' || COALESCE(v_activity.name, 'your run') || '" (' || ROUND(v_distance_km, 1) || ' km)',
        'points',
        jsonb_build_object(
            'strava_activity_id', p_strava_activity_id,
            'points', v_points,
            'distance_km', ROUND(v_distance_km, 2),
            'source_type', v_source_type
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'points_awarded', v_points,
        'source_type', v_source_type,
        'points_transaction_id', v_tx_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION award_strava_activity_points(BIGINT) IS
    'Awards points for a Strava activity. Only Run/TrailRun/VirtualRun types are eligible. Uses existing points scale (1-15 based on distance).';

-- ─── 6. Deauthorization Handler ──────────────────────────────────────────────

-- Function to delete all Strava data for a user (called on deauthorization)
-- Per Strava API Agreement: Delete data within 48 hours of access revocation
CREATE OR REPLACE FUNCTION delete_user_strava_data(p_strava_athlete_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_deleted_activities INTEGER;
BEGIN
    -- Get user_id from connection
    SELECT user_id INTO v_user_id
    FROM public.strava_connections
    WHERE strava_athlete_id = p_strava_athlete_id;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No connection found for athlete %', p_strava_athlete_id;
        RETURN;
    END IF;

    -- Delete all activities for this user
    WITH deleted AS (
        DELETE FROM public.strava_activities
        WHERE user_id = v_user_id
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_activities FROM deleted;

    -- Delete the connection
    DELETE FROM public.strava_connections
    WHERE strava_athlete_id = p_strava_athlete_id;

    -- Notify user about disconnection
    INSERT INTO public.notifications (user_id, title, body, type)
    VALUES (
        v_user_id,
        'Strava Disconnected',
        'Your Strava account has been disconnected. You can reconnect anytime from Settings.',
        'general'
    );

    RAISE NOTICE 'Deleted Strava data for user % (athlete %): % activities removed',
        v_user_id, p_strava_athlete_id, v_deleted_activities;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_user_strava_data(BIGINT) IS
    'Deletes all Strava data for a user when they deauthorize the app. Called by webhook on deauthorization event.';

-- ─── 7. Single Activity Deletion Handler ─────────────────────────────────────

-- Function to delete a single Strava activity (when user deletes on Strava)
CREATE OR REPLACE FUNCTION delete_strava_activity(p_strava_activity_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_found BOOLEAN;
BEGIN
    -- Delete the activity record
    -- Note: Points already awarded remain - they were legitimately earned
    DELETE FROM public.strava_activities
    WHERE strava_id = p_strava_activity_id;

    GET DIAGNOSTICS v_found = ROW_COUNT;

    IF v_found THEN
        RAISE NOTICE 'Deleted Strava activity %', p_strava_activity_id;
    END IF;

    RETURN v_found > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_strava_activity(BIGINT) IS
    'Deletes a single Strava activity when user deletes it on Strava. Points already awarded are kept.';

-- ─── 8. Backfill Existing Records ────────────────────────────────────────────

-- Set cached_until for any existing strava_activities records
UPDATE public.strava_activities
SET cached_until = synced_at + INTERVAL '7 days'
WHERE cached_until IS NULL AND synced_at IS NOT NULL;

-- ─── 9. Documentation ────────────────────────────────────────────────────────

COMMENT ON COLUMN public.strava_activities.cached_until IS
    'Timestamp after which activity data should be purged (7 days from sync per Strava API terms)';

COMMENT ON COLUMN public.strava_activities.points_awarded IS
    'Whether points have been awarded for this activity (prevents duplicate awards)';

COMMENT ON COLUMN public.strava_activities.points_transaction_id IS
    'Reference to the point_transactions record if points were awarded';
