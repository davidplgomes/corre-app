-- Drop the policy if it exists and recreate it
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can insert own profile during signup" ON public.users;
END $$;

-- Create the INSERT policy for users table
CREATE POLICY "Users can insert own profile during signup"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
