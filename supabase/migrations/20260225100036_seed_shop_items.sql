-- =====================================================
-- SEED MOCK DATA FOR OFFICIAL SHOP (corre_shop_items)
-- Execute this in Supabase Dashboard > SQL Editor to 
-- populate the shop with items for testing checkout.
-- =====================================================

INSERT INTO public.corre_shop_items (title, description, points_price, image_url, stock)
VALUES
    (
        'Camiseta Performance Corre', 
        'Camiseta oficial do app Corre. Tecido tecnológico, ultra respirável, ideal para treinos longos e provas. Absorve o suor e regula a temperatura do corpo.', 
        120, 
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800', 
        50
    ),
    (
        'Viseira Ultraleve', 
        'Proteção contra o sol sem pesar na cabeça. Material refletivo para corridas noturnas e ajuste em velcro.', 
        45, 
        'https://images.unsplash.com/photo-1556306535-0f09a536f0bl?auto=format&fit=crop&q=80&w=800', 
        100
    ),
    (
        'Meia de Compressão Recovery', 
        'Meias de compressão graduada para acelerar a recuperação muscular após treinos intensos. Reduz a fadiga e melhora a circulação.', 
        89, 
        'https://images.unsplash.com/photo-1588508065123-287b28e018ea?auto=format&fit=crop&q=80&w=800', 
        30
    ),
    (
        'Squeeze Térmico 500ml', 
        'Garrafa térmica leve que mantém a água gelada por até 12 horas. Bico ergonômico fácil de usar em movimento.', 
        65, 
        'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=800', 
        75
    ),
    (
        'Galocha Corta-Vento', 
        'Jaqueta corta-vento super leve. Pode ser dobrada até caber no próprio bolso. Resistente a chuvas leves.', 
        199, 
        'https://images.unsplash.com/photo-1556821840-2a63f5eace34?auto=format&fit=crop&q=80&w=800', 
        20
    )
ON CONFLICT DO NOTHING;
