-- Prevent auto-promotion from waitlist after event start time.

CREATE OR REPLACE FUNCTION public.promote_waitlist_on_participant_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_entry public.event_waitlist%ROWTYPE;
    v_event_title TEXT;
    v_event_datetime TIMESTAMPTZ;
    v_inserted_count INTEGER := 0;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = OLD.event_id) THEN
        RETURN OLD;
    END IF;

    SELECT title, event_datetime
    INTO v_event_title, v_event_datetime
    FROM public.events
    WHERE id = OLD.event_id;

    IF v_event_datetime < NOW() THEN
        RETURN OLD;
    END IF;

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

