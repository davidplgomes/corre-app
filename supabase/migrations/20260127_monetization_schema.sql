-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- 'Free', 'Pro', 'Club'
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    features JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access to plans
CREATE POLICY "Plans are viewable by everyone" ON public.plans
    FOR SELECT USING (true);


-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due'
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Update profiles table with gamification fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Starter'; -- 'Starter', 'Pacer', 'Elite'

-- Add constaint for level enum-like behavior if needed, but text is specified in plan.

-- Seed default plans
INSERT INTO public.plans (name, price, features)
VALUES 
    ('Free', 0.00, '{"description": "Visitante", "benefits": ["Acesso a Eventos Abertos", "Marketplace (Venda)", "Cupons Parceiros"]}'::jsonb),
    ('Pro', 29.90, '{"description": "Intermediário", "benefits": ["Desconto por XP", "Pagamento Hibrido (20%)", "1 Destaque Venda", "Eventos Exclusivos"]}'::jsonb),
    ('Club', 59.90, '{"description": "Premium", "benefits": ["Welcome Kit", "Guest Pass", "Fila Prioritária", "3 Destaques Venda", "Perfil Golden"]}'::jsonb)
ON CONFLICT (name) DO UPDATE 
SET price = EXCLUDED.price, features = EXCLUDED.features;
