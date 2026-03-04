-- =====================================================
-- FRIENDSHIP NOTIFICATIONS (REQUEST + ACCEPT)
-- Keeps social notifications in sync from DB events.
-- =====================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_friendship_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_name TEXT;
  v_addressee_name TEXT;
BEGIN
  SELECT full_name INTO v_requester_name FROM public.users WHERE id = NEW.requester_id;
  SELECT full_name INTO v_addressee_name FROM public.users WHERE id = NEW.addressee_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' THEN
      INSERT INTO public.notifications (user_id, title, body, type, data)
      VALUES (
        NEW.addressee_id,
        'New friend request',
        COALESCE(v_requester_name, 'Someone') || ' wants to connect with you.',
        'friend',
        jsonb_build_object(
          'friendshipId', NEW.id,
          'fromUserId', NEW.requester_id,
          'status', NEW.status
        )
      );
    ELSIF NEW.status = 'accepted' THEN
      INSERT INTO public.notifications (user_id, title, body, type, data)
      VALUES (
        NEW.requester_id,
        'Friend request accepted',
        COALESCE(v_addressee_name, 'A runner') || ' accepted your friend request.',
        'friend',
        jsonb_build_object(
          'friendshipId', NEW.id,
          'fromUserId', NEW.addressee_id,
          'status', NEW.status
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'accepted' THEN
      INSERT INTO public.notifications (user_id, title, body, type, data)
      VALUES (
        NEW.requester_id,
        'Friend request accepted',
        COALESCE(v_addressee_name, 'A runner') || ' accepted your friend request.',
        'friend',
        jsonb_build_object(
          'friendshipId', NEW.id,
          'fromUserId', NEW.addressee_id,
          'status', NEW.status
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friendships_notifications_trigger ON public.friendships;
CREATE TRIGGER friendships_notifications_trigger
AFTER INSERT OR UPDATE OF status
ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.handle_friendship_notifications();

COMMIT;
