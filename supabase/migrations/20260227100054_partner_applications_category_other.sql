-- Add support for free-text category detail when applicant selects "Other".

ALTER TABLE public.partner_applications
    ADD COLUMN IF NOT EXISTS category_other TEXT;

COMMENT ON COLUMN public.partner_applications.category_other IS
    'Custom category text provided when category is Other.';
