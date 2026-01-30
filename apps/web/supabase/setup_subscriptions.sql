-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    features JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'past_due', 'cancelled'
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for Plans
DROP POLICY IF EXISTS "Anyone can view plans" ON public.plans;
CREATE POLICY "Anyone can view plans" ON public.plans
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins can manage plans" ON public.plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policies for Subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Seed Data: Plans
INSERT INTO public.plans (name, price, description) VALUES
    ('Basic Tier', 9.99, 'Entry level access to runs'),
    ('Pro Runner', 24.99, 'Access to training plans and events'),
    ('Elite Club', 49.99, 'All access pass with merch')
ON CONFLICT DO NOTHING;

-- Seed Data: Subscriptions (Mock data linked to existing users if any, otherwise will be skipped or need users)
-- Note: In a real scenario, we'd need existing user IDs. 
-- Since we can't easily query IDs here to insert dynamically in pure SQL repeatedly without functions,
-- let's create a dummy function to seed subscriptions for existing users if table is empty.

DO $$
DECLARE
    v_plan_basic UUID;
    v_plan_pro UUID;
    v_user RECORD;
BEGIN
    SELECT id INTO v_plan_basic FROM public.plans WHERE name = 'Basic Tier' LIMIT 1;
    SELECT id INTO v_plan_pro FROM public.plans WHERE name = 'Pro Runner' LIMIT 1;

    -- Iterate over first 10 users to check/insert subscriptions
    FOR v_user IN SELECT id FROM public.users LIMIT 10 LOOP
        IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = v_user.id) THEN
            INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_end)
            VALUES (
                v_user.id, 
                CASE WHEN random() > 0.5 THEN v_plan_pro ELSE v_plan_basic END,
                'active',
                NOW() + INTERVAL '30 days'
            );
        END IF;
    END LOOP;
END $$;
