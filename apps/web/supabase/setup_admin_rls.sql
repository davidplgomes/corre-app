-- =============================================================================
-- RLS Policy to allow Admins to update user roles
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================================================

-- First, ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 1. Allow all authenticated users to READ all users (for listings)
CREATE POLICY "Users can view all users" ON public.users
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 2. Allow users to update their OWN profile (non-role fields)
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. Allow ADMINS to update ANY user (including role changes)
CREATE POLICY "Admins can update any user" ON public.users
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 4. Allow admins to delete users (optional, for user management)
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users" ON public.users
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- =============================================================================
-- VERIFICATION: Check current user's role
-- =============================================================================
-- SELECT id, email, role FROM public.users WHERE id = auth.uid();
