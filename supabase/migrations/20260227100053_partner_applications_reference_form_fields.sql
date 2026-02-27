-- Extend partner applications to match reference partnership intake form.

ALTER TABLE public.partner_applications
    ADD COLUMN IF NOT EXISTS club_benefits TEXT,
    ADD COLUMN IF NOT EXISTS staff_benefits TEXT,
    ADD COLUMN IF NOT EXISTS poc_name TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS membership TEXT,
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS phone_country_code TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'partner_applications_category_check'
    ) THEN
        ALTER TABLE public.partner_applications
            ADD CONSTRAINT partner_applications_category_check
            CHECK (
                category IS NULL OR category IN (
                    'Barber Shop',
                    'Beauty Salon',
                    'Physiotherapy Clinic',
                    'Massage',
                    'Supplements',
                    'Medical Clinic',
                    'Dental Practice',
                    'Gym',
                    'Restaurant',
                    'Clothing Shop',
                    'Hotel',
                    'Travel Agency',
                    'Tour Operator',
                    'Other'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'partner_applications_membership_check'
    ) THEN
        ALTER TABLE public.partner_applications
            ADD CONSTRAINT partner_applications_membership_check
            CHECK (
                membership IS NULL OR membership IN ('Free', 'Monthly', 'Annual')
            );
    END IF;
END $$;

COMMENT ON COLUMN public.partner_applications.club_benefits IS
    'Required. Club/member benefits proposed by the partner.';
COMMENT ON COLUMN public.partner_applications.staff_benefits IS
    'Required. Benefits proposed for staff/internal team.';
COMMENT ON COLUMN public.partner_applications.poc_name IS
    'Required. Primary point of contact name.';
COMMENT ON COLUMN public.partner_applications.category IS
    'Required. Partner business category chosen from controlled list.';
COMMENT ON COLUMN public.partner_applications.membership IS
    'Required. Membership plan type selected by applicant.';
COMMENT ON COLUMN public.partner_applications.start_date IS
    'Optional proposed start date for the partnership.';
COMMENT ON COLUMN public.partner_applications.logo_url IS
    'Optional uploaded logo URL.';
COMMENT ON COLUMN public.partner_applications.phone_country_code IS
    'Country dial code selected for phone input.';

-- Storage bucket for partner application logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-application-logos', 'partner-application-logos', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Public read for partner application logos'
    ) THEN
        CREATE POLICY "Public read for partner application logos"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'partner-application-logos');
    END IF;
END $$;
