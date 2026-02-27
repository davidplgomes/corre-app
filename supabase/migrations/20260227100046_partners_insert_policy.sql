-- =====================================================
-- Partners profile insert compatibility
-- Ensures authenticated partner users can create their own
-- row in public.partners (required by web onboarding/settings).
-- =====================================================

-- Backfill user_id from id for legacy rows where possible.
UPDATE public.partners p
SET user_id = p.id
WHERE p.user_id IS NULL
  AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'partners'
          AND policyname = 'Partners can insert own profile'
    ) THEN
        CREATE POLICY "Partners can insert own profile"
            ON public.partners
            FOR INSERT
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;
