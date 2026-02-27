-- Seed mock partner coupons with referral links
-- Replaces the basic sample data from the original migration with richer mock data for testing

-- ─── Ensure all required columns exist (defensive – live DB may have been
--     created with an earlier version of the schema) ───────────────────────

ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS partner TEXT NOT NULL DEFAULT '';
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS points_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS discount_value INTEGER;
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS stock_limit INTEGER;
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS redeemed_count INTEGER DEFAULT 0;
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.partner_coupons ADD COLUMN IF NOT EXISTS terms TEXT;

-- Drop NOT NULL on partner_id so seed rows (not owned by any specific partner) can be inserted
ALTER TABLE public.partner_coupons ALTER COLUMN partner_id DROP NOT NULL;

-- Remove original sample rows so we can replace them cleanly
DELETE FROM public.partner_coupons
WHERE code IN (
    'CORRE10NIKE',
    'CORREGROW15',
    'CORREFREE',
    'CORRERUN20',
    'CORRESTRAVA',
    'CORRE2X1G'
);

-- Insert richer mock coupons with referral links
INSERT INTO public.partner_coupons
    (title, description, partner, code, points_required, discount_type, discount_value, category, expires_at, referral_link, stock_limit)
VALUES
    (
        '10% OFF',
        'Em qualquer compra na Nike Store online ou física',
        'Nike',
        'CORRE10NIKE',
        500,
        'percentage',
        10,
        'fashion',
        NOW() + INTERVAL '60 days',
        'https://www.nike.com.br',
        200
    ),
    (
        '20% OFF',
        'Em tênis de corrida selecionados — coleção Run 2026',
        'Centauro',
        'CORRERUN20',
        1000,
        'percentage',
        20,
        'sports',
        NOW() + INTERVAL '30 days',
        'https://www.centauro.com.br',
        150
    ),
    (
        '15% OFF',
        'Em suplementos, whey protein e vitaminas',
        'Growth Supplements',
        'CORREGROW15',
        750,
        'percentage',
        15,
        'health',
        NOW() + INTERVAL '90 days',
        'https://www.gsuplementos.com.br',
        NULL
    ),
    (
        'Frete Grátis',
        'Em pedidos acima de R$100 na Netshoes',
        'Netshoes',
        'CORREFREE',
        300,
        'freebie',
        NULL,
        'fashion',
        NOW() + INTERVAL '45 days',
        'https://www.netshoes.com.br',
        500
    ),
    (
        'R$30 OFF',
        'Na primeira assinatura mensal Strava Premium',
        'Strava Premium',
        'CORRESTRAVA',
        800,
        'fixed',
        3000,
        'apps',
        NOW() + INTERVAL '120 days',
        'https://www.strava.com/subscribe',
        NULL
    ),
    (
        '2x1',
        'Leve 2 e pague 1 em bebidas isotônicas Gatorade',
        'Gatorade',
        'CORRE2X1G',
        400,
        'freebie',
        NULL,
        'drinks',
        NOW() + INTERVAL '20 days',
        'https://www.gatorade.com.br',
        300
    ),
    (
        '10% OFF',
        'Em qualquer produto de corrida ou trilha na Decathlon',
        'Decathlon',
        'CORREDECA10',
        600,
        'percentage',
        10,
        'sports',
        NOW() + INTERVAL '75 days',
        'https://www.decathlon.com.br',
        NULL
    ),
    (
        '12% OFF',
        'Em medicamentos, suplementos e produtos de saúde',
        'Drogaria São Paulo',
        'CORREDSP12',
        650,
        'percentage',
        12,
        'health',
        NOW() + INTERVAL '50 days',
        'https://www.drogariasaopaulo.com.br',
        250
    );
