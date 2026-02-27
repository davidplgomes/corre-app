-- Normalize events.event_type to the mobile-supported set:
-- routine | special | race
--
-- This keeps web-created events fully compatible with mobile screens,
-- points breakdown logic, and check-in stats code paths.

-- 1) Map descriptive web-only values into supported types
UPDATE public.events
SET event_type = CASE
    WHEN event_type IN ('group_run', 'coffee_run', 'social') THEN 'special'
    ELSE event_type
END
WHERE event_type IN ('group_run', 'coffee_run', 'social');

-- 2) Re-create strict check constraint with mobile-compatible values only
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
    END LOOP;
END $$;

ALTER TABLE public.events
ADD CONSTRAINT events_event_type_check
    CHECK (event_type IN ('routine', 'special', 'race'));

COMMENT ON CONSTRAINT events_event_type_check ON public.events IS
    'Mobile-compatible event types: routine, special, race.';
