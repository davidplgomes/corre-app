-- Partner applications intake workflow
-- Public users submit applications, admins review and decide approve/decline.

CREATE TABLE IF NOT EXISTS public.partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    business_name TEXT NOT NULL,
    business_description TEXT,
    contact_email TEXT,
    website_url TEXT,
    instagram_handle TEXT,
    business_address TEXT,
    city TEXT,
    country TEXT,
    partnership_focus TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    review_notes TEXT,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_partner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_status
    ON public.partner_applications(status);

CREATE INDEX IF NOT EXISTS idx_partner_applications_created_at
    ON public.partner_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_applications_email
    ON public.partner_applications(LOWER(email));

COMMENT ON TABLE public.partner_applications IS
    'Applications submitted by prospective partners, reviewed by admins before account creation.';

CREATE OR REPLACE FUNCTION public.set_partner_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_partner_applications_updated_at'
    ) THEN
        CREATE TRIGGER trg_partner_applications_updated_at
            BEFORE UPDATE ON public.partner_applications
            FOR EACH ROW EXECUTE FUNCTION public.set_partner_applications_updated_at();
    END IF;
END $$;

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'partner_applications'
          AND policyname = 'Admins can view all partner applications'
    ) THEN
        CREATE POLICY "Admins can view all partner applications"
            ON public.partner_applications FOR SELECT
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.users
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'partner_applications'
          AND policyname = 'Admins can update partner applications'
    ) THEN
        CREATE POLICY "Admins can update partner applications"
            ON public.partner_applications FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.users
                    WHERE id = auth.uid() AND role = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'partner_applications'
          AND policyname = 'Service role full access on partner applications'
    ) THEN
        CREATE POLICY "Service role full access on partner applications"
            ON public.partner_applications FOR ALL
            USING (auth.role() = 'service_role');
    END IF;
END $$;
