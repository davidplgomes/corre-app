-- Secure Guest Pass System
-- Adds verification codes, tier enforcement, and check-in tracking

-- Add verification columns to guest_passes
ALTER TABLE public.guest_passes
ADD COLUMN IF NOT EXISTS verification_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.users(id);

-- Create index for fast verification code lookups
CREATE INDEX IF NOT EXISTS idx_guest_passes_verification_code
ON public.guest_passes(verification_code) WHERE verification_code IS NOT NULL;

-- Function to generate a unique 8-character verification code
CREATE OR REPLACE FUNCTION generate_guest_pass_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No ambiguous chars (0,O,1,I,L)
    code TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Secure function to create/use guest pass with tier verification
CREATE OR REPLACE FUNCTION use_guest_pass_secure(
    p_user_id UUID,
    p_guest_name TEXT,
    p_guest_email TEXT,
    p_event_id UUID
)
RETURNS TABLE(
    id UUID,
    verification_code TEXT,
    guest_name TEXT,
    event_title TEXT,
    event_datetime TIMESTAMPTZ
) AS $$
DECLARE
    v_membership_tier TEXT;
    v_current_month DATE;
    v_existing_pass UUID;
    v_code TEXT;
    v_pass_id UUID;
    v_event_record RECORD;
BEGIN
    -- Get user's membership tier
    SELECT membership_tier INTO v_membership_tier
    FROM public.users
    WHERE users.id = p_user_id;

    -- Verify user has Club tier (only Club members get guest passes)
    IF v_membership_tier IS NULL OR v_membership_tier != 'club' THEN
        RAISE EXCEPTION 'Guest Pass is an exclusive Club membership benefit';
    END IF;

    -- Get current month (first day)
    v_current_month := date_trunc('month', CURRENT_DATE)::DATE;

    -- Check if pass already used this month
    SELECT gp.id INTO v_existing_pass
    FROM public.guest_passes gp
    WHERE gp.user_id = p_user_id
    AND gp.valid_month = v_current_month
    AND gp.used_at IS NOT NULL;

    IF v_existing_pass IS NOT NULL THEN
        RAISE EXCEPTION 'Guest pass already used this month';
    END IF;

    -- Verify event exists and is in the future
    SELECT e.id, e.title, e.event_datetime INTO v_event_record
    FROM public.events e
    WHERE e.id = p_event_id
    AND e.event_datetime > NOW();

    IF v_event_record.id IS NULL THEN
        RAISE EXCEPTION 'Event not found or already passed';
    END IF;

    -- Generate unique verification code
    LOOP
        v_code := generate_guest_pass_code();
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM public.guest_passes WHERE guest_passes.verification_code = v_code) THEN
            EXIT;
        END IF;
    END LOOP;

    -- Create or update guest pass
    INSERT INTO public.guest_passes (
        user_id,
        valid_month,
        guest_name,
        guest_email,
        event_id,
        verification_code,
        used_at
    ) VALUES (
        p_user_id,
        v_current_month,
        p_guest_name,
        p_guest_email,
        p_event_id,
        v_code,
        NOW()
    )
    ON CONFLICT (user_id, valid_month)
    DO UPDATE SET
        guest_name = EXCLUDED.guest_name,
        guest_email = EXCLUDED.guest_email,
        event_id = EXCLUDED.event_id,
        verification_code = EXCLUDED.verification_code,
        used_at = NOW()
    RETURNING guest_passes.id INTO v_pass_id;

    -- Return pass details
    RETURN QUERY
    SELECT
        gp.id,
        gp.verification_code,
        gp.guest_name,
        e.title,
        e.event_datetime
    FROM public.guest_passes gp
    JOIN public.events e ON e.id = gp.event_id
    WHERE gp.id = v_pass_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify and check-in a guest pass (for event staff)
CREATE OR REPLACE FUNCTION verify_guest_pass(
    p_verification_code TEXT,
    p_staff_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
    valid BOOLEAN,
    message TEXT,
    guest_name TEXT,
    host_name TEXT,
    event_title TEXT,
    event_datetime TIMESTAMPTZ,
    already_checked_in BOOLEAN
) AS $$
DECLARE
    v_pass RECORD;
BEGIN
    -- Find the pass
    SELECT
        gp.*,
        u.full_name as host_name,
        e.title as event_title,
        e.event_datetime
    INTO v_pass
    FROM public.guest_passes gp
    JOIN public.users u ON u.id = gp.user_id
    JOIN public.events e ON e.id = gp.event_id
    WHERE gp.verification_code = UPPER(p_verification_code);

    -- Pass not found
    IF v_pass IS NULL THEN
        RETURN QUERY SELECT
            FALSE,
            'Invalid verification code'::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TIMESTAMPTZ,
            FALSE;
        RETURN;
    END IF;

    -- Check if event date matches (allow check-in on event day only)
    IF v_pass.event_datetime::DATE != CURRENT_DATE THEN
        RETURN QUERY SELECT
            FALSE,
            'Pass is not valid for today'::TEXT,
            v_pass.guest_name,
            v_pass.host_name,
            v_pass.event_title,
            v_pass.event_datetime,
            FALSE;
        RETURN;
    END IF;

    -- Already checked in
    IF v_pass.checked_in_at IS NOT NULL THEN
        RETURN QUERY SELECT
            TRUE,
            'Already checked in'::TEXT,
            v_pass.guest_name,
            v_pass.host_name,
            v_pass.event_title,
            v_pass.event_datetime,
            TRUE;
        RETURN;
    END IF;

    -- Mark as checked in
    UPDATE public.guest_passes
    SET
        checked_in_at = NOW(),
        checked_in_by = p_staff_user_id
    WHERE id = v_pass.id;

    -- Return success
    RETURN QUERY SELECT
        TRUE,
        'Check-in successful'::TEXT,
        v_pass.guest_name,
        v_pass.host_name,
        v_pass.event_title,
        v_pass.event_datetime,
        FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION use_guest_pass_secure TO authenticated;
GRANT EXECUTE ON FUNCTION verify_guest_pass TO authenticated;

-- Add comment
COMMENT ON FUNCTION use_guest_pass_secure IS 'Securely creates a guest pass with tier verification and unique code';
COMMENT ON FUNCTION verify_guest_pass IS 'Verifies and checks in a guest pass at events';
