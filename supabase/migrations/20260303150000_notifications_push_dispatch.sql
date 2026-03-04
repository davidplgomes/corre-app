-- =====================================================
-- Notification push dispatch (database-triggered)
-- - Adds push dispatch tracking columns
-- - Queues Expo push via pg_net on notifications INSERT
-- - Adds optional user self-insert policy for local app history
-- =====================================================

BEGIN;

-- Try to enable pg_net (non-fatal if unavailable in this environment).
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
    EXCEPTION
        WHEN OTHERS THEN
            BEGIN
                CREATE EXTENSION IF NOT EXISTS pg_net;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'pg_net extension unavailable: %', SQLERRM;
            END;
    END;
END $$;

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS push_dispatch_request_id BIGINT,
    ADD COLUMN IF NOT EXISTS push_dispatched_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS push_dispatch_attempted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS push_dispatch_error TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_push_pending
    ON public.notifications(created_at DESC)
    WHERE push_dispatched_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notifications'
          AND policyname = 'Users can insert own notifications'
    ) THEN
        CREATE POLICY "Users can insert own notifications"
            ON public.notifications
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.queue_push_for_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_push_token TEXT;
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

    SELECT push_token
    INTO v_push_token
    FROM public.users
    WHERE id = NEW.user_id;

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

DROP TRIGGER IF EXISTS notifications_push_dispatch_trigger ON public.notifications;

CREATE TRIGGER notifications_push_dispatch_trigger
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.queue_push_for_notification();

COMMENT ON FUNCTION public.queue_push_for_notification() IS
    'Queues Expo push delivery for newly inserted notifications via pg_net.';

COMMIT;

