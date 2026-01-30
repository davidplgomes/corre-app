-- Add is_active column to shop_items table
-- Run this in Supabase Dashboard > SQL Editor

-- Add the is_active column with default value true
ALTER TABLE public.shop_items 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing rows to have is_active = true
UPDATE public.shop_items SET is_active = true WHERE is_active IS NULL;

-- ============================================================================
-- If the shop_items table doesn't exist yet, create it:
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    points_price INTEGER NOT NULL DEFAULT 100,
    image_url TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

-- Allow public read access
DROP POLICY IF EXISTS "Anyone can view shop items" ON public.shop_items;
CREATE POLICY "Anyone can view shop items" ON public.shop_items
    FOR SELECT USING (true);

-- Allow admins to manage shop items
DROP POLICY IF EXISTS "Admins can manage shop items" ON public.shop_items;
CREATE POLICY "Admins can manage shop items" ON public.shop_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );
