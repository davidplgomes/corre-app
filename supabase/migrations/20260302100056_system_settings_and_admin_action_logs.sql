-- =====================================================
-- Admin dashboard settings + action audit foundation
-- - Creates system_settings table for global dashboard config
-- - Creates admin_action_logs table for auditable admin operations
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.system_settings IS
    'Global runtime settings used by admin dashboard and operational controls.';

COMMENT ON COLUMN public.system_settings.key IS
    'Config namespace key (example: general, features, maintenance).';

COMMENT ON COLUMN public.system_settings.value IS
    'JSON payload for the key namespace.';

CREATE OR REPLACE FUNCTION public.set_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_system_settings_updated_at'
    ) THEN
        CREATE TRIGGER trg_system_settings_updated_at
            BEFORE UPDATE ON public.system_settings
            FOR EACH ROW
            EXECUTE FUNCTION public.set_system_settings_updated_at();
    END IF;
END $$;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'system_settings'
          AND policyname = 'Admins can read system settings'
    ) THEN
        CREATE POLICY "Admins can read system settings"
            ON public.system_settings
            FOR SELECT
            USING (public.is_current_user_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'system_settings'
          AND policyname = 'Admins can manage system settings'
    ) THEN
        CREATE POLICY "Admins can manage system settings"
            ON public.system_settings
            FOR ALL
            USING (public.is_current_user_admin())
            WITH CHECK (public.is_current_user_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'system_settings'
          AND policyname = 'Service role full access on system settings'
    ) THEN
        CREATE POLICY "Service role full access on system settings"
            ON public.system_settings
            FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

INSERT INTO public.system_settings (key, value)
VALUES
    (
        'general',
        jsonb_build_object(
            'app_name', 'Corre App',
            'support_email', 'support@corre.app',
            'banner_message', ''
        )
    ),
    (
        'features',
        jsonb_build_object(
            'public_registration', true,
            'beta_features', false,
            'debug_logging', true
        )
    ),
    (
        'maintenance',
        jsonb_build_object(
            'enabled', false
        )
    )
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admin_action_logs IS
    'Audit log of privileged actions triggered from admin dashboard.';

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at
    ON public.admin_action_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_actor
    ON public.admin_action_logs(actor_id);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'admin_action_logs'
          AND policyname = 'Admins can read admin action logs'
    ) THEN
        CREATE POLICY "Admins can read admin action logs"
            ON public.admin_action_logs
            FOR SELECT
            USING (public.is_current_user_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'admin_action_logs'
          AND policyname = 'Admins can insert admin action logs'
    ) THEN
        CREATE POLICY "Admins can insert admin action logs"
            ON public.admin_action_logs
            FOR INSERT
            WITH CHECK (public.is_current_user_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'admin_action_logs'
          AND policyname = 'Service role full access on admin action logs'
    ) THEN
        CREATE POLICY "Service role full access on admin action logs"
            ON public.admin_action_logs
            FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;
