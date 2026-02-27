-- Backfill partner business profiles for users already marked as role='partner'
-- but missing a row in public.partners.

INSERT INTO public.partners (
    id,
    user_id,
    business_name,
    contact_email,
    is_active
)
SELECT
    gen_random_uuid(),
    u.id,
    CASE
        WHEN COALESCE(NULLIF(trim(u.full_name), ''), '') = '' THEN NULL
        ELSE trim(u.full_name) || ' Business'
    END AS business_name,
    u.email,
    TRUE
FROM public.users u
WHERE u.role = 'partner'
  AND NOT EXISTS (
      SELECT 1
      FROM public.partners p
      WHERE p.user_id = u.id
  );
