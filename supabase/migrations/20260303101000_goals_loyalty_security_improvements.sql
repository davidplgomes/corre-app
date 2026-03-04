BEGIN;

-- =====================================================
-- USER GOALS (CUSTOMIZABLE PROFILE GOALS)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('weekly_distance', 'weekly_runs', 'monthly_distance', 'streak')),
  target_value NUMERIC(10,2) NOT NULL CHECK (target_value > 0),
  title TEXT NOT NULL,
  unit TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user ON public.user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_type ON public.user_goals(goal_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_goals_unique_active_type
  ON public.user_goals(user_id, goal_type)
  WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION public.set_user_goals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_goals_updated_at ON public.user_goals;
CREATE TRIGGER trg_user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_goals_updated_at();

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_goals' AND policyname = 'Users can view own goals'
  ) THEN
    CREATE POLICY "Users can view own goals"
      ON public.user_goals FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_goals' AND policyname = 'Users can insert own goals'
  ) THEN
    CREATE POLICY "Users can insert own goals"
      ON public.user_goals FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_goals' AND policyname = 'Users can update own goals'
  ) THEN
    CREATE POLICY "Users can update own goals"
      ON public.user_goals FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_goals' AND policyname = 'Users can delete own goals'
  ) THEN
    CREATE POLICY "Users can delete own goals"
      ON public.user_goals FOR DELETE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_goals' AND policyname = 'Admins can manage all goals'
  ) THEN
    CREATE POLICY "Admins can manage all goals"
      ON public.user_goals FOR ALL
      USING (public.is_current_user_admin())
      WITH CHECK (public.is_current_user_admin());
  END IF;
END;
$$;

COMMENT ON TABLE public.user_goals IS 'User-customizable goals shown in app profile and goals screen';

-- =====================================================
-- SECURE QR PAYLOAD GENERATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_user_qr_payload(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
  v_timestamp BIGINT;
  v_signature TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF auth.uid() <> p_user_id AND NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden');
  END IF;

  SELECT qr_secret INTO v_secret
  FROM public.users
  WHERE id = p_user_id;

  IF v_secret IS NULL OR length(v_secret) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'QR secret unavailable');
  END IF;

  v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
  v_signature := encode(
    hmac(
      p_user_id::TEXT || v_timestamp::TEXT,
      v_secret,
      'sha256'
    ),
    'hex'
  );

  RETURN jsonb_build_object(
    'success', true,
    'payload', jsonb_build_object(
      'id', p_user_id::TEXT,
      'ts', v_timestamp,
      'sig', v_signature
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_user_qr_payload(UUID) TO authenticated;

-- =====================================================
-- MERCHANT REDEMPTION LEDGER (SCAN + DISCOUNT APPLY)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  customer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  membership_tier TEXT NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  amount_before_cents INTEGER NOT NULL CHECK (amount_before_cents >= 0),
  amount_discount_cents INTEGER NOT NULL CHECK (amount_discount_cents >= 0),
  amount_final_cents INTEGER NOT NULL CHECK (amount_final_cents >= 0),
  qr_timestamp BIGINT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_merchant_created
  ON public.loyalty_redemptions(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_customer_created
  ON public.loyalty_redemptions(customer_user_id, created_at DESC);

ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'loyalty_redemptions' AND policyname = 'Merchants can insert loyalty redemptions'
  ) THEN
    CREATE POLICY "Merchants can insert loyalty redemptions"
      ON public.loyalty_redemptions FOR INSERT
      WITH CHECK (auth.uid() = merchant_id AND public.is_current_user_merchant());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'loyalty_redemptions' AND policyname = 'Merchants can view own loyalty redemptions'
  ) THEN
    CREATE POLICY "Merchants can view own loyalty redemptions"
      ON public.loyalty_redemptions FOR SELECT
      USING (auth.uid() = merchant_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'loyalty_redemptions' AND policyname = 'Users can view own loyalty redemptions'
  ) THEN
    CREATE POLICY "Users can view own loyalty redemptions"
      ON public.loyalty_redemptions FOR SELECT
      USING (auth.uid() = customer_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'loyalty_redemptions' AND policyname = 'Admins can view all loyalty redemptions'
  ) THEN
    CREATE POLICY "Admins can view all loyalty redemptions"
      ON public.loyalty_redemptions FOR SELECT
      USING (public.is_current_user_admin());
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_loyalty_scan(
  p_user_id UUID,
  p_timestamp BIGINT,
  p_signature TEXT,
  p_amount_cents INTEGER,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validation RECORD;
  v_discount_percent INTEGER;
  v_discount_cents INTEGER;
  v_final_cents INTEGER;
  v_redemption_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT public.is_current_user_merchant() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only merchant accounts can redeem scans');
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase amount must be greater than zero');
  END IF;

  SELECT * INTO v_validation
  FROM public.validate_qr_code(p_user_id, p_timestamp, p_signature)
  LIMIT 1;

  IF v_validation IS NULL OR v_validation.valid IS DISTINCT FROM TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_validation.error_message, 'Invalid QR code')
    );
  END IF;

  v_discount_percent := GREATEST(0, LEAST(COALESCE(v_validation.discount, 0), 100));
  v_discount_cents := FLOOR((p_amount_cents::NUMERIC * v_discount_percent::NUMERIC) / 100.0)::INTEGER;
  v_final_cents := GREATEST(p_amount_cents - v_discount_cents, 0);

  INSERT INTO public.loyalty_redemptions (
    merchant_id,
    customer_user_id,
    membership_tier,
    discount_percent,
    amount_before_cents,
    amount_discount_cents,
    amount_final_cents,
    qr_timestamp,
    metadata
  ) VALUES (
    auth.uid(),
    p_user_id,
    COALESCE(v_validation.tier, 'free'),
    v_discount_percent,
    p_amount_cents,
    v_discount_cents,
    v_final_cents,
    p_timestamp,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_redemption_id;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'discount_percent', v_discount_percent,
    'amount_before_cents', p_amount_cents,
    'amount_discount_cents', v_discount_cents,
    'amount_final_cents', v_final_cents
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_loyalty_scan(UUID, BIGINT, TEXT, INTEGER, JSONB) TO authenticated;

COMMIT;
