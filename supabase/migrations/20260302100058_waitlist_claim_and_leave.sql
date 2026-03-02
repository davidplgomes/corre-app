-- =====================================================
-- Event waitlist claim/leave hardening
-- - Adds missing RLS policies for INSERT/DELETE on event_waitlist
-- - Adds atomic RPCs:
--   * claim_event_waitlist_spot
--   * leave_event_waitlist_entry
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'event_waitlist'
          AND policyname = 'Users can join own event waitlist'
    ) THEN
        CREATE POLICY "Users can join own event waitlist"
            ON public.event_waitlist
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'event_waitlist'
          AND policyname = 'Users can leave own event waitlist'
    ) THEN
        CREATE POLICY "Users can leave own event waitlist"
            ON public.event_waitlist
            FOR DELETE
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'event_waitlist'
          AND policyname = 'Service role full access on event waitlist'
    ) THEN
        CREATE POLICY "Service role full access on event waitlist"
            ON public.event_waitlist
            FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

DROP FUNCTION IF EXISTS public.claim_event_waitlist_spot(UUID);

CREATE OR REPLACE FUNCTION public.claim_event_waitlist_spot(
    p_waitlist_entry_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_entry public.event_waitlist%ROWTYPE;
    v_top_entry_id UUID;
    v_event_datetime TIMESTAMPTZ;
    v_inserted_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NOT_AUTHENTICATED',
            'message', 'You must be signed in'
        );
    END IF;

    SELECT *
    INTO v_entry
    FROM public.event_waitlist
    WHERE id = p_waitlist_entry_id
      AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'WAITLIST_ENTRY_NOT_FOUND',
            'message', 'Waitlist entry not found'
        );
    END IF;

    SELECT event_datetime
    INTO v_event_datetime
    FROM public.events
    WHERE id = v_entry.event_id;

    IF v_event_datetime IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'EVENT_NOT_FOUND',
            'message', 'Event not found'
        );
    END IF;

    IF v_event_datetime < NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'EVENT_ALREADY_STARTED',
            'message', 'This event has already started'
        );
    END IF;

    -- Enforce queue order: only the top-ranked entry can claim.
    SELECT ew.id
    INTO v_top_entry_id
    FROM public.event_waitlist ew
    WHERE ew.event_id = v_entry.event_id
    ORDER BY ew.position ASC, ew.tier_priority ASC, ew.joined_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_top_entry_id IS DISTINCT FROM v_entry.id THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'WAITLIST_NOT_READY',
            'message', 'This spot is not available for your position yet',
            'position', v_entry.position
        );
    END IF;

    INSERT INTO public.event_participants (event_id, user_id)
    VALUES (v_entry.event_id, v_user_id)
    ON CONFLICT (event_id, user_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    DELETE FROM public.event_waitlist
    WHERE id = v_entry.id;

    UPDATE public.event_waitlist
    SET position = position - 1
    WHERE event_id = v_entry.event_id
      AND position > v_entry.position;

    RETURN jsonb_build_object(
        'success', true,
        'event_id', v_entry.event_id,
        'already_registered', (v_inserted_count = 0)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'UNEXPECTED_ERROR',
            'message', SQLERRM
        );
END;
$$;

DROP FUNCTION IF EXISTS public.leave_event_waitlist_entry(UUID);

CREATE OR REPLACE FUNCTION public.leave_event_waitlist_entry(
    p_waitlist_entry_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_entry public.event_waitlist%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NOT_AUTHENTICATED',
            'message', 'You must be signed in'
        );
    END IF;

    SELECT *
    INTO v_entry
    FROM public.event_waitlist
    WHERE id = p_waitlist_entry_id
      AND user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'WAITLIST_ENTRY_NOT_FOUND',
            'message', 'Waitlist entry not found'
        );
    END IF;

    DELETE FROM public.event_waitlist
    WHERE id = v_entry.id;

    UPDATE public.event_waitlist
    SET position = position - 1
    WHERE event_id = v_entry.event_id
      AND position > v_entry.position;

    RETURN jsonb_build_object(
        'success', true,
        'event_id', v_entry.event_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'UNEXPECTED_ERROR',
            'message', SQLERRM
        );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_event_waitlist_spot(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_event_waitlist_spot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_event_waitlist_spot(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.leave_event_waitlist_entry(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_event_waitlist_entry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_event_waitlist_entry(UUID) TO service_role;

COMMENT ON FUNCTION public.claim_event_waitlist_spot(UUID) IS
    'Atomically claims a waitlist spot, inserts participant, and reindexes queue.';

COMMENT ON FUNCTION public.leave_event_waitlist_entry(UUID) IS
    'Leaves waitlist entry and reindexes queue positions for the event.';
