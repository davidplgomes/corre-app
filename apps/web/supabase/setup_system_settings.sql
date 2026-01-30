-- System Settings Table for Admin Dashboard
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Anyone can view settings" ON public.system_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins to modify settings
CREATE POLICY "Admins can modify settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Insert default settings
INSERT INTO public.system_settings (key, value) VALUES
    ('general', '{"app_name": "Corre App", "support_email": "support@corre.app", "banner_message": ""}'),
    ('features', '{"public_registration": true, "beta_features": false, "debug_logging": true}'),
    ('maintenance', '{"enabled": false}')
ON CONFLICT (key) DO NOTHING;
