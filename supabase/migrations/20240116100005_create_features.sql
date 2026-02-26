-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create feed_posts table
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT CHECK (activity_type IN ('run', 'check_in', 'post')),
    content TEXT,
    media_url TEXT,
    meta_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- Policies for feed_posts
CREATE POLICY "Public profiles can read feed posts" 
    ON public.feed_posts FOR SELECT 
    USING (true);

CREATE POLICY "Users can create their own posts" 
    ON public.feed_posts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 2. Create marketplace_items table (User-to-User)
CREATE TABLE IF NOT EXISTS public.marketplace_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    image_url TEXT,
    category TEXT DEFAULT 'gear',
    status TEXT CHECK (status IN ('active', 'sold')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

-- Policies for marketplace_items
CREATE POLICY "Anyone can read marketplace items" 
    ON public.marketplace_items FOR SELECT 
    USING (true);

CREATE POLICY "Users can create items" 
    ON public.marketplace_items FOR INSERT 
    WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own items" 
    ON public.marketplace_items FOR UPDATE 
    USING (auth.uid() = seller_id);

-- 3. Create corre_shop_items table (Official Shop)
CREATE TABLE IF NOT EXISTS public.corre_shop_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    points_price INTEGER NOT NULL,
    image_url TEXT,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.corre_shop_items ENABLE ROW LEVEL SECURITY;

-- Policies for corre_shop_items
CREATE POLICY "Anyone can read shop items" 
    ON public.corre_shop_items FOR SELECT 
    USING (true);

-- Only service role can insert (for now) via admin scripts
-- No public insert policy
