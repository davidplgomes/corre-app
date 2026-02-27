-- Ensure partners.id always auto-generates.
-- Some environments had partners.id without a default, causing inserts/upserts
-- to fail with NOT NULL violation.

ALTER TABLE public.partners
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
