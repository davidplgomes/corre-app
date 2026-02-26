ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE public.users ADD CONSTRAINT instagram_handle_length_check CHECK (length(instagram_handle) <= 30);
