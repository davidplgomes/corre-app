-- =====================================================
-- Notification opt-in preference
-- - Persist per-user push opt-in in DB
-- - Ensure dispatch trigger respects opt-out
-- =====================================================

BEGIN;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.users.notifications_enabled IS
    'Whether the user wants remote push notifications. Local app notifications are controlled client-side.';

CREATE OR REPLACE FUNCTION public.queue_push_for_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_push_token TEXT;
    v_notifications_enabled BOOLEAN := TRUE;
    v_request_id BIGINT;
    v_data JSONB := COALESCE(NEW.data, '{}'::jsonb);
    v_payload JSONB;
BEGIN
    IF NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Do not re-push notifications generated locally on the same device.
    IF COALESCE(v_data ->> 'source', '') = 'local_app' THEN
        UPDATE public.notifications
        SET push_dispatch_attempted_at = NOW(),
            push_dispatch_error = 'skipped_local_app'
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    SELECT
        push_token,
        COALESCE(notifications_enabled, TRUE)
    INTO
        v_push_token,
        v_notifications_enabled
    FROM public.users
    WHERE id = NEW.user_id;

    IF NOT v_notifications_enabled THEN
        UPDATE public.notifications
        SET push_dispatch_attempted_at = NOW(),
            push_dispatch_error = 'notifications_disabled'
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    IF v_push_token IS NULL
       OR (
            v_push_token NOT LIKE 'ExpoPushToken[%'
            AND v_push_token NOT LIKE 'ExponentPushToken[%'
       )
    THEN
        UPDATE public.notifications
        SET push_dispatch_attempted_at = NOW(),
            push_dispatch_error = 'missing_or_invalid_push_token'
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        UPDATE public.notifications
        SET push_dispatch_attempted_at = NOW(),
            push_dispatch_error = 'pg_net_extension_unavailable'
        WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    v_payload := jsonb_build_object(
        'to', v_push_token,
        'sound', 'default',
        'title', NEW.title,
        'body', NEW.body,
        'data', v_data || jsonb_build_object('notificationId', NEW.id)
    );

    SELECT net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
        body := v_payload
    )
    INTO v_request_id;

    UPDATE public.notifications
    SET push_dispatch_request_id = v_request_id,
        push_dispatched_at = NOW(),
        push_dispatch_attempted_at = NOW(),
        push_dispatch_error = NULL
    WHERE id = NEW.id;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        UPDATE public.notifications
        SET push_dispatch_attempted_at = NOW(),
            push_dispatch_error = LEFT(SQLERRM, 500)
        WHERE id = NEW.id;
        RETURN NEW;
END;
$$;

COMMIT;
