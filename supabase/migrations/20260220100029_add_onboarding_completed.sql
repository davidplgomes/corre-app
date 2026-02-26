-- Add onboarding_completed column to users table
-- This tracks whether a user has completed the onboarding flow (welcome screens + Strava connect)

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON public.users(onboarding_completed);

-- Comment for documentation
COMMENT ON COLUMN public.users.onboarding_completed IS 'Whether user has completed the post-signup onboarding flow';
