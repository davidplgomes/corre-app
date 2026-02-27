-- Remove legacy foreign key that linked partners.id -> users.id
-- This old constraint causes ambiguous embeds in PostgREST and
-- conflicts with the intended relation partners.user_id -> users.id.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'partners'
          AND c.conname = 'partners_id_fkey'
    ) THEN
        ALTER TABLE public.partners
            DROP CONSTRAINT partners_id_fkey;
    END IF;
END $$;
