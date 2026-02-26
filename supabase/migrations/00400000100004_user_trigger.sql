-- Create a trigger function to automatically create user profile
-- This runs when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    neighborhood,
    language_preference,
    qr_code_secret,
    membership_tier,
    current_month_points,
    total_lifetime_points,
    is_merchant
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'neighborhood', 'Porto'),
    COALESCE(NEW.raw_user_meta_data->>'language_preference', 'en'),
    COALESCE(NEW.raw_user_meta_data->>'qr_code_secret', gen_random_uuid()::text),
    'free',
    0,
    0,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires on new auth user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
