-- =====================================================
-- Event join + waitlist production flow
-- - Adds events.max_participants
-- - Adds atomic join_event_or_waitlist RPC
-- - Auto-promotes top waitlist entry when a participant leaves
-- =====================================================

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS max_participants INTEGER NOT NULL DEFAULT 50;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.events'::regclass
          AND conname = 'events_max_participants_check'
    ) THEN
        ALTER TABLE public.events
            ADD CONSTRAINT events_max_participants_check
                CHECK (max_participants > 0);
    END IF;
END $$;

DROP FUNCTION IF EXISTS public.join_event_or_waitlist(UUID);

CREATE OR REPLACE FUNCTION public.join_event_or_waitlist(
    p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_event_datetime TIMESTAMPTZ;
    v_event_title TEXT;
    v_max_participants INTEGER;
    v_current_participants INTEGER;
    v_existing_waitlist_position INTEGER;
    v_tier TEXT;
    v_tier_priority INTEGER := 3;
    v_waitlist_position INTEGER;
    v_inserted_count INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NOT_AUTHENTICATED',
            'message', 'You must be signed in'
        );
    END IF;

    SELECT event_datetime, title, max_participants
    INTO v_event_datetime, v_event_title, v_max_participants
    FROM public.events
    WHERE id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
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

    IF EXISTS (
        SELECT 1
        FROM public.event_participants
        WHERE event_id = p_event_id
          AND user_id = v_user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', true,
            'joined', true,
            'waitlisted', false,
            'already_joined', true,
            'event_id', p_event_id
        );
    END IF;

    SELECT position
    INTO v_existing_waitlist_position
    FROM public.event_waitlist
    WHERE event_id = p_event_id
      AND user_id = v_user_id
    LIMIT 1;

    IF v_existing_waitlist_position IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'joined', false,
            'waitlisted', true,
            'already_waitlisted', true,
            'position', v_existing_waitlist_position,
            'event_id', p_event_id
        );
    END IF;

    SELECT COUNT(*)
    INTO v_current_participants
    FROM public.event_participants
    WHERE event_id = p_event_id;

    IF v_current_participants < COALESCE(v_max_participants, 50) THEN
        INSERT INTO public.event_participants (event_id, user_id)
        VALUES (p_event_id, v_user_id)
        ON CONFLICT (event_id, user_id) DO NOTHING;

        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

        IF v_inserted_count > 0 THEN
            RETURN jsonb_build_object(
                'success', true,
                'joined', true,
                'waitlisted', false,
                'event_id', p_event_id
            );
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'joined', true,
            'waitlisted', false,
            'already_joined', true,
            'event_id', p_event_id
        );
    END IF;

    SELECT membership_tier
    INTO v_tier
    FROM public.users
    WHERE id = v_user_id;

    v_tier_priority := CASE
        WHEN v_tier IN ('club', 'parceiros') THEN 1
        WHEN v_tier IN ('pro', 'baixa_pace', 'basico') THEN 2
        ELSE 3
    END;

    SELECT COALESCE(MAX(position), 0) + 1
    INTO v_waitlist_position
    FROM public.event_waitlist
    WHERE event_id = p_event_id;

    INSERT INTO public.event_waitlist (
        event_id,
        user_id,
        position,
        tier_priority
    ) VALUES (
        p_event_id,
        v_user_id,
        v_waitlist_position,
        v_tier_priority
    )
    ON CONFLICT (event_id, user_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'joined', false,
        'waitlisted', true,
        'position', v_waitlist_position,
        'event_id', p_event_id,
        'code', 'WAITLIST_JOINED',
        'message', format('Event is currently full. You were added to the waitlist for %s.', COALESCE(v_event_title, 'this event'))
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

REVOKE ALL ON FUNCTION public.join_event_or_waitlist(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_event_or_waitlist(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_event_or_waitlist(UUID) TO service_role;

COMMENT ON FUNCTION public.join_event_or_waitlist(UUID) IS
    'Atomically joins event if capacity is available, otherwise inserts user in event waitlist.';

CREATE OR REPLACE FUNCTION public.promote_waitlist_on_participant_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_entry public.event_waitlist%ROWTYPE;
    v_event_title TEXT;
    v_inserted_count INTEGER := 0;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = OLD.event_id) THEN
        RETURN OLD;
    END IF;

    SELECT title
    INTO v_event_title
    FROM public.events
    WHERE id = OLD.event_id;

    SELECT *
    INTO v_next_entry
    FROM public.event_waitlist
    WHERE event_id = OLD.event_id
    ORDER BY position ASC, tier_priority ASC, joined_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN OLD;
    END IF;

    INSERT INTO public.event_participants (event_id, user_id)
    VALUES (v_next_entry.event_id, v_next_entry.user_id)
    ON CONFLICT (event_id, user_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    DELETE FROM public.event_waitlist
    WHERE id = v_next_entry.id;

    UPDATE public.event_waitlist
    SET position = position - 1
    WHERE event_id = v_next_entry.event_id
      AND position > v_next_entry.position;

    IF v_inserted_count > 0 THEN
        INSERT INTO public.notifications (user_id, title, body, type, data)
        VALUES (
            v_next_entry.user_id,
            'Spot available',
            format('A spot opened for "%s". You are now registered.', COALESCE(v_event_title, 'this event')),
            'event',
            jsonb_build_object(
                'eventId', v_next_entry.event_id,
                'source', 'waitlist_promotion'
            )
        );
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_waitlist_on_participant_leave ON public.event_participants;

CREATE TRIGGER trg_promote_waitlist_on_participant_leave
AFTER DELETE ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.promote_waitlist_on_participant_leave();
