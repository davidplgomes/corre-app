-- =====================================================
-- FIX MEMBERSHIP TIER CONSTRAINT
-- The original constraint was created inline without a name,
-- so we need to find and drop it by querying pg_constraint
-- =====================================================

-- Drop ALL check constraints on membership_tier column
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'users'
          AND att.attname = 'membership_tier'
          AND con.contype = 'c'
    LOOP
        EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Now add the constraint with all tier options
ALTER TABLE public.users ADD CONSTRAINT users_membership_tier_check
    CHECK (membership_tier IN ('free', 'pro', 'club', 'basico', 'baixa_pace', 'parceiros'));

COMMENT ON CONSTRAINT users_membership_tier_check ON public.users IS 'Valid membership tiers: free, pro, club (and legacy: basico, baixa_pace, parceiros)';
