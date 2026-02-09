-- Corre App - Subscription-Based Referral Rewards
-- This migration updates the referral system to reward 1 free month of Pro subscription
-- ONLY Pro users can be referrers

-- Add new columns to referrals table
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS free_month_granted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS referrer_subscription_extended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS referred_subscription_extended_at TIMESTAMPTZ;

-- Update status check constraint to include new status
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE public.referrals ADD CONSTRAINT referrals_status_check 
  CHECK (status IN ('pending', 'subscribed', 'rewarded'));

-- Function to check if user is Pro (can be a referrer)
CREATE OR REPLACE FUNCTION is_pro_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_active_sub BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND p.name IN ('Pro', 'Club')
      AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
  ) INTO v_has_active_sub;
  
  RETURN v_has_active_sub;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function (changing return type from BOOLEAN to JSONB)
DROP FUNCTION IF EXISTS apply_referral_code(UUID, TEXT);

-- Updated apply_referral_code function (only Pro users can refer)
CREATE OR REPLACE FUNCTION apply_referral_code(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Find the referrer
  SELECT user_id INTO v_referrer_id 
  FROM public.referral_codes 
  WHERE code = UPPER(p_referral_code);
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid referral code');
  END IF;
  
  -- Make sure user isn't referring themselves
  IF v_referrer_id = p_referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot use your own code');
  END IF;
  
  -- Check if referrer is a Pro user
  IF NOT is_pro_user(v_referrer_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Referrer must be a Pro member');
  END IF;
  
  -- Check if this user was already referred
  IF EXISTS(SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You already have a referrer');
  END IF;
  
  -- Create referral record (status = pending until they subscribe)
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
  VALUES (v_referrer_id, p_referred_user_id, UPPER(p_referral_code), 'pending');
  
  -- Update referral code stats
  UPDATE public.referral_codes 
  SET total_referrals = total_referrals + 1
  WHERE user_id = v_referrer_id;
  
  -- Save referral code on user record
  UPDATE public.users
  SET referred_by_code = UPPER(p_referral_code)
  WHERE id = p_referred_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Referral code applied! Subscribe to Pro to unlock rewards for both of you.'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to process referral reward when referred user subscribes for the first time
CREATE OR REPLACE FUNCTION process_referral_subscription_reward()
RETURNS TRIGGER AS $$
DECLARE
  v_referral RECORD;
  v_pro_plan_id UUID;
  v_referrer_sub RECORD;
  v_new_period_end TIMESTAMPTZ;
BEGIN
  -- Only process on new subscriptions with active status
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    
    -- Get Pro plan ID
    SELECT id INTO v_pro_plan_id FROM public.plans WHERE name = 'Pro' LIMIT 1;
    
    -- Check if this is the user's first subscription (no previous rewarded referrals)
    -- and they have a pending referral
    SELECT * INTO v_referral 
    FROM public.referrals 
    WHERE referred_id = NEW.user_id 
      AND status = 'pending'
      AND free_month_granted = FALSE;
    
    IF NOT FOUND THEN
      RETURN NEW; -- No pending referral
    END IF;
    
    -- Verify this is their first ever subscription
    IF EXISTS(
      SELECT 1 FROM public.subscriptions 
      WHERE user_id = NEW.user_id 
        AND id != NEW.id
    ) THEN
      RETURN NEW; -- Not their first subscription
    END IF;
    
    -- REWARD 1: Extend referred user's subscription by 30 days
    UPDATE public.subscriptions
    SET current_period_end = COALESCE(current_period_end, NOW()) + INTERVAL '30 days'
    WHERE id = NEW.id;
    
    -- REWARD 2: Extend referrer's Pro subscription by 30 days
    SELECT * INTO v_referrer_sub
    FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.user_id = v_referral.referrer_id
      AND s.status = 'active'
      AND p.name IN ('Pro', 'Club')
    ORDER BY s.current_period_end DESC NULLS LAST
    LIMIT 1;
    
    IF v_referrer_sub IS NOT NULL THEN
      UPDATE public.subscriptions
      SET current_period_end = COALESCE(current_period_end, NOW()) + INTERVAL '30 days'
      WHERE id = v_referrer_sub.id;
    END IF;
    
    -- Update referral status
    UPDATE public.referrals 
    SET status = 'rewarded',
        free_month_granted = TRUE,
        referrer_subscription_extended_at = NOW(),
        referred_subscription_extended_at = NOW()
    WHERE id = v_referral.id;
    
    -- Update referral code stats
    UPDATE public.referral_codes 
    SET successful_referrals = successful_referrals + 1
    WHERE user_id = v_referral.referrer_id;
    
    -- Notify the referrer
    INSERT INTO public.notifications (user_id, title, body, type, data)
    VALUES (
      v_referral.referrer_id,
      'Referral Reward! 🎉',
      'Your friend subscribed to Pro! You both earned 1 free month.',
      'referral',
      jsonb_build_object('referral_id', v_referral.id, 'reward', '1 month Pro')
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription insert
DROP TRIGGER IF EXISTS trigger_referral_subscription_reward ON public.subscriptions;
CREATE TRIGGER trigger_referral_subscription_reward
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_subscription_reward();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referrals_free_month ON public.referrals(free_month_granted);

-- Comments
COMMENT ON FUNCTION is_pro_user IS 'Check if user has active Pro or Club subscription';
COMMENT ON FUNCTION process_referral_subscription_reward IS 'Grants 1 free month to both referrer and referred when referred subscribes';
