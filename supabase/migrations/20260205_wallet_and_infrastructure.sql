-- Corre App - Wallet Transactions with TTL-based Points
-- This migration separates XP (monthly reset) from Points (TTL-based currency)

-- Add current_xp field to users table (separate from points)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0 CHECK (current_xp >= 0);

-- Add xp_level field to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS xp_level TEXT DEFAULT 'starter' CHECK (xp_level IN ('starter', 'pacer', 'elite'));

-- Create point_transactions table with TTL tracking
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  points_amount INTEGER NOT NULL CHECK (points_amount > 0),
  points_remaining INTEGER NOT NULL CHECK (points_remaining >= 0),
  source_type TEXT NOT NULL CHECK (source_type IN ('routine', 'special', 'race', 'purchase_refund')),
  source_id UUID, -- Reference to the event/check_in that generated points
  description TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ, -- NULL until fully consumed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for point_transactions
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_expires ON public.point_transactions(expires_at);
CREATE INDEX IF NOT EXISTS idx_point_transactions_remaining ON public.point_transactions(user_id, points_remaining) WHERE points_remaining > 0;

-- Create orders table for shop purchases
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  points_used INTEGER DEFAULT 0,
  cash_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
  stripe_payment_intent_id TEXT,
  shipping_address JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('shop', 'marketplace')),
  item_id UUID NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('shop', 'marketplace')),
  item_id UUID NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

-- Create guest_passes table for Club tier
CREATE TABLE IF NOT EXISTS public.guest_passes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  guest_email TEXT,
  guest_name TEXT,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  valid_month DATE NOT NULL, -- First day of the month this pass is valid for
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, valid_month) -- One guest pass per month per user
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'event', 'points', 'order', 'friend', 'subscription')),
  data JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- Create event_waitlist table
CREATE TABLE IF NOT EXISTS public.event_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  tier_priority INTEGER NOT NULL, -- 1=club, 2=pro, 3=free (for ordering)
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  promoted_at TIMESTAMPTZ, -- When moved from waitlist to participants
  UNIQUE(event_id, user_id)
);

-- Create index for waitlist ordering
CREATE INDEX IF NOT EXISTS idx_waitlist_order ON public.event_waitlist(event_id, tier_priority, joined_at);

-- Function to calculate TTL based on source type
CREATE OR REPLACE FUNCTION calculate_points_expiry(source TEXT, earned TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  CASE source
    WHEN 'routine' THEN
      RETURN earned + INTERVAL '30 days';
    WHEN 'special' THEN
      RETURN earned + INTERVAL '60 days';
    WHEN 'race' THEN
      RETURN earned + INTERVAL '12 months';
    ELSE
      RETURN earned + INTERVAL '30 days';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to add points with automatic TTL
CREATE OR REPLACE FUNCTION add_points_with_ttl(
  p_user_id UUID,
  p_points INTEGER,
  p_source_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
  v_transaction_id UUID;
BEGIN
  -- Calculate expiry based on source type
  v_expires_at := calculate_points_expiry(p_source_type, NOW());
  
  -- Insert the transaction
  INSERT INTO public.point_transactions (
    user_id, points_amount, points_remaining, source_type, source_id, description, expires_at
  ) VALUES (
    p_user_id, p_points, p_points, p_source_type, p_source_id, p_description, v_expires_at
  ) RETURNING id INTO v_transaction_id;
  
  -- Update user's total points (for display)
  UPDATE public.users 
  SET current_month_points = current_month_points + p_points
  WHERE id = p_user_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to consume points using FIFO
CREATE OR REPLACE FUNCTION consume_points_fifo(
  p_user_id UUID,
  p_points_to_consume INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_remaining INTEGER := p_points_to_consume;
  v_transaction RECORD;
  v_available INTEGER;
BEGIN
  -- Check if user has enough points
  SELECT COALESCE(SUM(points_remaining), 0) INTO v_available
  FROM public.point_transactions
  WHERE user_id = p_user_id 
    AND points_remaining > 0 
    AND expires_at > NOW();
  
  IF v_available < p_points_to_consume THEN
    RETURN FALSE;
  END IF;
  
  -- Consume points in FIFO order (oldest first, considering expiry)
  FOR v_transaction IN 
    SELECT id, points_remaining 
    FROM public.point_transactions
    WHERE user_id = p_user_id 
      AND points_remaining > 0 
      AND expires_at > NOW()
    ORDER BY expires_at ASC, earned_at ASC
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;
    
    IF v_transaction.points_remaining <= v_remaining THEN
      -- Consume entire transaction
      UPDATE public.point_transactions 
      SET points_remaining = 0, consumed_at = NOW()
      WHERE id = v_transaction.id;
      v_remaining := v_remaining - v_transaction.points_remaining;
    ELSE
      -- Partial consumption
      UPDATE public.point_transactions 
      SET points_remaining = points_remaining - v_remaining
      WHERE id = v_transaction.id;
      v_remaining := 0;
    END IF;
  END LOOP;
  
  -- Update user's total points
  UPDATE public.users 
  SET current_month_points = current_month_points - p_points_to_consume
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's available points (not expired)
CREATE OR REPLACE FUNCTION get_available_points(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(points_remaining), 0) INTO v_total
  FROM public.point_transactions
  WHERE user_id = p_user_id 
    AND points_remaining > 0 
    AND expires_at > NOW();
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate and update user level based on XP
CREATE OR REPLACE FUNCTION update_user_level(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_xp INTEGER;
  v_new_level TEXT;
BEGIN
  SELECT current_xp INTO v_xp FROM public.users WHERE id = p_user_id;
  
  IF v_xp >= 15000 THEN
    v_new_level := 'elite';
  ELSIF v_xp >= 10000 THEN
    v_new_level := 'pacer';
  ELSE
    v_new_level := 'starter';
  END IF;
  
  UPDATE public.users SET xp_level = v_new_level WHERE id = p_user_id;
  
  RETURN v_new_level;
END;
$$ LANGUAGE plpgsql;

-- Function to add XP and points simultaneously (for check-ins)
CREATE OR REPLACE FUNCTION add_xp_and_points(
  p_user_id UUID,
  p_xp INTEGER,
  p_points INTEGER,
  p_source_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level TEXT, points_transaction_id UUID) AS $$
DECLARE
  v_new_xp INTEGER;
  v_level TEXT;
  v_tx_id UUID;
BEGIN
  -- Add XP
  UPDATE public.users 
  SET current_xp = current_xp + p_xp
  WHERE id = p_user_id
  RETURNING current_xp INTO v_new_xp;
  
  -- Update level
  v_level := update_user_level(p_user_id);
  
  -- Add points with TTL
  v_tx_id := add_points_with_ttl(p_user_id, p_points, p_source_type, p_source_id, p_description);
  
  RETURN QUERY SELECT v_new_xp, v_level, v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- Scheduled job to reset XP on first day of month (requires pg_cron)
-- This should be run via a separate cron job or Supabase Edge Function
-- CREATE OR REPLACE FUNCTION reset_monthly_xp()
-- RETURNS void AS $$
-- BEGIN
--   UPDATE public.users SET current_xp = 0, xp_level = 'starter';
-- END;
-- $$ LANGUAGE plpgsql;

-- RLS Policies for new tables
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;

-- Users can view their own point transactions
CREATE POLICY "Users can view own point transactions" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can manage their own cart
CREATE POLICY "Users can manage own cart" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id);

-- Users can view/manage their own guest passes
CREATE POLICY "Users can manage own guest passes" ON public.guest_passes
  FOR ALL USING (auth.uid() = user_id);

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view waitlist for events they've joined
CREATE POLICY "Users can view event waitlist" ON public.event_waitlist
  FOR SELECT USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.point_transactions IS 'Points earned with TTL tracking for FIFO consumption';
COMMENT ON TABLE public.orders IS 'Shop and marketplace orders';
COMMENT ON TABLE public.cart_items IS 'User shopping cart';
COMMENT ON TABLE public.guest_passes IS 'Monthly guest passes for Club tier members';
COMMENT ON TABLE public.notifications IS 'Push notification history';
COMMENT ON TABLE public.event_waitlist IS 'Event waitlist with tier-based priority';
