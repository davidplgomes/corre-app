-- Corre App - Referral System
-- This migration creates the referral tracking system for user acquisition

-- Create referral_codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0 CHECK (total_referrals >= 0),
  successful_referrals INTEGER DEFAULT 0 CHECK (successful_referrals >= 0),
  points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for quick code lookup
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON public.referral_codes(user_id);

-- Create referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  -- pending: signed up but no check-in yet
  -- completed: first check-in done, rewards given
  -- rewarded: fully processed
  referrer_points INTEGER DEFAULT 0,
  referred_points INTEGER DEFAULT 0,
  referrer_rewarded_at TIMESTAMPTZ,
  referred_rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- Add referral_code field to users table (for tracking who referred them)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referred_by_code TEXT;

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(p_name TEXT)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code: first 4 letters of name + 4 random numbers
    v_code := UPPER(SUBSTRING(REGEXP_REPLACE(p_name, '[^a-zA-Z]', '', 'g'), 1, 4));
    IF LENGTH(v_code) < 4 THEN
      v_code := v_code || REPEAT('X', 4 - LENGTH(v_code));
    END IF;
    v_code := v_code || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create referral code for user
CREATE OR REPLACE FUNCTION get_or_create_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_name TEXT;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = p_user_id;
  
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Get user's name for code generation
  SELECT full_name INTO v_name FROM public.users WHERE id = p_user_id;
  
  -- Generate new code
  v_code := generate_referral_code(COALESCE(v_name, 'USER'));
  
  -- Insert new referral code
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (p_user_id, v_code);
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to apply referral code during signup
CREATE OR REPLACE FUNCTION apply_referral_code(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_referrer_id UUID;
  v_welcome_bonus INTEGER := 25; -- Points for new user
BEGIN
  -- Find the referrer
  SELECT user_id INTO v_referrer_id 
  FROM public.referral_codes 
  WHERE code = UPPER(p_referral_code);
  
  IF v_referrer_id IS NULL THEN
    RETURN FALSE; -- Invalid code
  END IF;
  
  -- Make sure user isn't referring themselves
  IF v_referrer_id = p_referred_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Check if this user was already referred
  IF EXISTS(SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id) THEN
    RETURN FALSE; -- Already has a referrer
  END IF;
  
  -- Create referral record
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, referred_points, referred_rewarded_at)
  VALUES (v_referrer_id, p_referred_user_id, UPPER(p_referral_code), v_welcome_bonus, NOW());
  
  -- Update referral code stats
  UPDATE public.referral_codes 
  SET total_referrals = total_referrals + 1
  WHERE user_id = v_referrer_id;
  
  -- Save referral code on user record
  UPDATE public.users
  SET referred_by_code = UPPER(p_referral_code)
  WHERE id = p_referred_user_id;
  
  -- Give welcome bonus to referred user (special points - 60 day TTL)
  PERFORM add_points_with_ttl(
    p_referred_user_id,
    v_welcome_bonus,
    'special',
    NULL,
    'Welcome bonus from referral'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to process referral reward when referred user completes first check-in
CREATE OR REPLACE FUNCTION process_referral_reward(p_referred_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_referral RECORD;
  v_referrer_bonus INTEGER := 50; -- Points for referrer
BEGIN
  -- Find pending referral
  SELECT * INTO v_referral 
  FROM public.referrals 
  WHERE referred_id = p_referred_user_id 
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN; -- No pending referral
  END IF;
  
  -- Update referral status
  UPDATE public.referrals 
  SET status = 'completed',
      referrer_points = v_referrer_bonus,
      referrer_rewarded_at = NOW()
  WHERE id = v_referral.id;
  
  -- Update referral code stats
  UPDATE public.referral_codes 
  SET successful_referrals = successful_referrals + 1,
      points_earned = points_earned + v_referrer_bonus
  WHERE user_id = v_referral.referrer_id;
  
  -- Give bonus points to referrer (special points - 60 day TTL)
  PERFORM add_points_with_ttl(
    v_referral.referrer_id,
    v_referrer_bonus,
    'special',
    NULL,
    'Referral bonus - friend completed first check-in'
  );
  
  -- Create notification for referrer
  INSERT INTO public.notifications (user_id, title, body, type, data)
  VALUES (
    v_referral.referrer_id,
    'Referral Reward!',
    'Your friend completed their first check-in! You earned ' || v_referrer_bonus || ' bonus points.',
    'points',
    jsonb_build_object('referral_id', v_referral.id, 'points', v_referrer_bonus)
  );
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referral code
CREATE POLICY "Users can view own referral code" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view referrals they made
CREATE POLICY "Users can view their referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Comments
COMMENT ON TABLE public.referral_codes IS 'Unique referral codes for each user';
COMMENT ON TABLE public.referrals IS 'Tracks referrals and reward status';
