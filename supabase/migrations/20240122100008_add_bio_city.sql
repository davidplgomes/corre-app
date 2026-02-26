ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE public.users ADD CONSTRAINT bio_length_check CHECK (length(bio) <= 500);
