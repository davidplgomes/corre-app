-- Add privacy visibility settings to users table
-- Options: 'friends' (only friends), 'anyone' (public), 'nobody' (private - name only)

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS privacy_visibility TEXT DEFAULT 'friends' 
CHECK (privacy_visibility IN ('friends', 'anyone', 'nobody'));

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_privacy ON public.users(privacy_visibility);

COMMENT ON COLUMN public.users.privacy_visibility IS 'Controls who can see this user profile: friends, anyone, or nobody';
