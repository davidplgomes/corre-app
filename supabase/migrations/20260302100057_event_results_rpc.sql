-- =====================================================
-- Event results RPC for mobile EventResults screen
-- - Returns event metadata + participant ranking rows
-- - Ranking tie-breaks:
--   1) completion_seconds ASC (faster finish first)
--   2) points_earned DESC
--   3) checked_in_at ASC
--   4) joined_at ASC
-- =====================================================

DROP FUNCTION IF EXISTS public.get_event_results(UUID);

CREATE OR REPLACE FUNCTION public.get_event_results(p_event_id UUID)
RETURNS TABLE (
    event_id UUID,
    event_title TEXT,
    event_datetime TIMESTAMPTZ,
    event_location_name TEXT,
    event_points_value INTEGER,
    participant_id UUID,
    participant_name TEXT,
    participant_avatar_url TEXT,
    participant_position INTEGER,
    completion_seconds INTEGER,
    checked_in_at TIMESTAMPTZ,
    points_earned INTEGER,
    is_checked_in BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH event_base AS (
    SELECT
        e.id,
        e.title,
        e.event_datetime,
        e.location_name,
        e.points_value
    FROM public.events e
    WHERE e.id = p_event_id
),
participant_rows AS (
    SELECT
        ep.user_id,
        ep.joined_at,
        u.full_name,
        u.avatar_url,
        c.checked_in_at,
        c.points_earned,
        CASE
            WHEN c.checked_in_at IS NULL THEN NULL
            ELSE GREATEST(
                EXTRACT(EPOCH FROM (c.checked_in_at - eb.event_datetime))::INTEGER,
                0
            )
        END AS completion_seconds
    FROM event_base eb
    JOIN public.event_participants ep
        ON ep.event_id = eb.id
    LEFT JOIN public.users u
        ON u.id = ep.user_id
    LEFT JOIN public.check_ins c
        ON c.event_id = ep.event_id
       AND c.user_id = ep.user_id
),
ranked_rows AS (
    SELECT
        pr.*,
        CASE
            WHEN pr.checked_in_at IS NULL THEN NULL
            ELSE ROW_NUMBER() OVER (
                ORDER BY
                    pr.completion_seconds ASC NULLS LAST,
                    pr.points_earned DESC NULLS LAST,
                    pr.checked_in_at ASC NULLS LAST,
                    pr.joined_at ASC,
                    pr.user_id ASC
            )
        END AS participant_position
    FROM participant_rows pr
)
SELECT
    eb.id AS event_id,
    eb.title AS event_title,
    eb.event_datetime,
    eb.location_name AS event_location_name,
    eb.points_value AS event_points_value,
    rr.user_id AS participant_id,
    rr.full_name AS participant_name,
    rr.avatar_url AS participant_avatar_url,
    rr.participant_position,
    rr.completion_seconds,
    rr.checked_in_at,
    rr.points_earned,
    (rr.checked_in_at IS NOT NULL) AS is_checked_in
FROM event_base eb
LEFT JOIN ranked_rows rr ON TRUE
ORDER BY
    rr.participant_position ASC NULLS LAST,
    rr.joined_at ASC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_event_results(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_event_results(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_results(UUID) TO service_role;

COMMENT ON FUNCTION public.get_event_results(UUID) IS
    'Returns event metadata and ranked participant rows for Event Results screen.';
