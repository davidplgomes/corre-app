-- =====================================================
-- SEED MOCK DATA FOR MARKETPLACE (COMMUNITY)
-- Execute this in Supabase Dashboard > SQL Editor to 
-- populate the marketplace with items for testing.
-- =====================================================

DO $$
DECLARE
    v_seller_1_id UUID;
    v_seller_2_id UUID;
BEGIN
    -- Try to find at least one or two users to act as sellers
    -- (This selects up to two random users from the users table)
    SELECT id INTO v_seller_1_id FROM public.users LIMIT 1;
    SELECT id INTO v_seller_2_id FROM public.users WHERE id != v_seller_1_id LIMIT 1;

    -- If there's only one user in the database, use them for both
    IF v_seller_2_id IS NULL THEN
        v_seller_2_id := v_seller_1_id;
    END IF;

    -- If no users exist yet, we cannot seed the marketplace
    IF v_seller_1_id IS NULL THEN
        RAISE NOTICE 'No users found in public.users. Please create an account in the app first before seeding the marketplace.';
        RETURN;
    END IF;

    -- Ensure these users have a seller_account (Stripe Connect mock)
    -- so that the create-marketplace-payment function doesn't crash
    INSERT INTO public.seller_accounts (user_id, stripe_account_id, onboarding_complete, charges_enabled, payouts_enabled)
    VALUES 
        (v_seller_1_id, 'acct_1OuXTestMock1', true, true, true)
    ON CONFLICT (user_id) DO UPDATE SET 
        onboarding_complete = true, charges_enabled = true, payouts_enabled = true;

    IF v_seller_1_id != v_seller_2_id THEN
        INSERT INTO public.seller_accounts (user_id, stripe_account_id, onboarding_complete, charges_enabled, payouts_enabled)
        VALUES 
            (v_seller_2_id, 'acct_1OuXTestMock2', true, true, true)
        ON CONFLICT (user_id) DO UPDATE SET 
            onboarding_complete = true, charges_enabled = true, payouts_enabled = true;
    END IF;

    -- Insert mock listings
    INSERT INTO public.marketplace_listings 
        (seller_id, title, description, price_cents, images, condition, category, size, brand, status)
    VALUES
        (
            v_seller_1_id,
            'Nike Alphafly Next% 2 - Usado em 2 maratonas',
            'Tênis de altíssima performance. Tem cerca de 100km rodados. Estou vendendo porque comprei o 3.',
            18000, -- € 180,00
            ARRAY['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800'],
            'good',
            'shoes',
            '42',
            'Nike',
            'active'
        ),
        (
            v_seller_2_id,
            'Garmin Forerunner 245 Music',
            'Relógio impecável, sem ricos na tela. Bateria dura 5 dias com GPS. Acompanha carregador original.',
            15000, -- € 150,00
            ARRAY['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800'],
            'like_new',
            'electronics',
            NULL,
            'Garmin',
            'active'
        ),
        (
            v_seller_1_id,
            'Bermuda Compressão Fila',
            'Bermuda com bolsos laterais grandes. Usada poucas vezes. Perfeita para levar gel e celular.',
            2500, -- € 25,00
            ARRAY['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800'],
            'new',
            'clothing',
            'M',
            'Fila',
            'active'
        ),
        (
            v_seller_2_id,
            'Asics Novablast 3',
            'Tênis muito versátil. Usei para rodagens mas o tamanho ficou pequeno pra mim (meu pé é 41 largo).',
            8000, -- € 80,00
            ARRAY['https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800'],
            'good',
            'shoes',
            '41',
            'Asics',
            'active'
        ),
        (
            v_seller_2_id,
            'Cinto de Hidratação Salomon',
            'Cinto com espaço para garrafa de 600ml e zíper para chaves. Muito estável, não pula correndo.',
            3500, -- € 35,00
            ARRAY['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800'],
            'like_new',
            'accessories',
            'Único',
            'Salomon',
            'active'
        );

    RAISE NOTICE 'Marketplace mock data generated successfully!';
END $$;
