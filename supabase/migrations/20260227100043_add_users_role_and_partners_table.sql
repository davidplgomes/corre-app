-- =====================================================
-- Sprint 1: Core foundation fixes
-- 1. Add role column to users table (web dashboard auth)
-- 2. Create partners table (business profiles for web)
-- 3. Create partner_places table (locations managed by partners)
-- =====================================================

-- ─── 1. Add role to users ─────────────────────────────────

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'partner', 'admin'));

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

COMMENT ON COLUMN public.users.role IS
    'Access role: user (mobile app), partner (web dashboard), admin (full access)';

-- ─── 2. Create partners table ─────────────────────────────

-- Partners are users with role=''partner'' plus a business profile row.
-- The web dashboard joins partners.user_id → users.id to get the representative.

CREATE TABLE IF NOT EXISTS public.partners (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns that may be missing if the table was created with an older schema
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS user_id     UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS business_name        TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS business_logo_url    TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS contact_email        TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS website_url          TEXT;

CREATE INDEX IF NOT EXISTS idx_partners_user_id  ON public.partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_active   ON public.partners(is_active) WHERE is_active = true;

COMMENT ON TABLE public.partners IS
    'Business profile for partner users. One row per partner (user_id is unique).';

-- RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partners' AND policyname='Admins can manage all partners') THEN
        CREATE POLICY "Admins can manage all partners" ON public.partners FOR ALL
            USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partners' AND policyname='Partners can view own profile') THEN
        CREATE POLICY "Partners can view own profile" ON public.partners FOR SELECT
            USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partners' AND policyname='Partners can update own profile') THEN
        CREATE POLICY "Partners can update own profile" ON public.partners FOR UPDATE
            USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partners' AND policyname='Service role full access on partners') THEN
        CREATE POLICY "Service role full access on partners" ON public.partners FOR ALL
            USING (auth.role() = 'service_role');
    END IF;
END $$;

-- ─── 3. Create partner_places table ───────────────────────

CREATE TABLE IF NOT EXISTS public.partner_places (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id  UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    address     TEXT,
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    description TEXT,
    image_url   TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_places_partner ON public.partner_places(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_places_active  ON public.partner_places(is_active) WHERE is_active = true;

COMMENT ON TABLE public.partner_places IS
    'Physical locations owned by a partner (gyms, stores, event venues, etc.)';

-- RLS
ALTER TABLE public.partner_places ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_places' AND policyname='Anyone can view active places') THEN
        CREATE POLICY "Anyone can view active places" ON public.partner_places FOR SELECT USING (is_active = true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_places' AND policyname='Partners can manage own places') THEN
        CREATE POLICY "Partners can manage own places" ON public.partner_places FOR ALL
            USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_places' AND policyname='Admins can manage all places') THEN
        CREATE POLICY "Admins can manage all places" ON public.partner_places FOR ALL
            USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partner_places' AND policyname='Service role full access on places') THEN
        CREATE POLICY "Service role full access on places" ON public.partner_places FOR ALL
            USING (auth.role() = 'service_role');
    END IF;
END $$;

-- ─── 4. Trigger: auto-update partners.updated_at ──────────

CREATE OR REPLACE FUNCTION public.set_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_partners_updated_at') THEN
        CREATE TRIGGER trg_partners_updated_at
            BEFORE UPDATE ON public.partners
            FOR EACH ROW EXECUTE FUNCTION public.set_partners_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_partner_places_updated_at') THEN
        CREATE TRIGGER trg_partner_places_updated_at
            BEFORE UPDATE ON public.partner_places
            FOR EACH ROW EXECUTE FUNCTION public.set_partners_updated_at();
    END IF;
END $$;