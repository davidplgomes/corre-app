-- Fix infinite recursion in RLS policies on public.users
-- Root cause: policies on public.users queried public.users directly.
-- Solution: use SECURITY DEFINER helpers that bypass RLS safely.

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_merchant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.is_merchant = TRUE
  );
$$;

-- Replace recursive policies on users
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Merchants can view user tiers by QR" ON public.users;

CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  USING (public.is_current_user_admin());

CREATE POLICY "Merchants can view user tiers by QR"
  ON public.users
  FOR SELECT
  USING (
    is_merchant = TRUE
    OR auth.uid() = id
    OR public.is_current_user_merchant()
  );
