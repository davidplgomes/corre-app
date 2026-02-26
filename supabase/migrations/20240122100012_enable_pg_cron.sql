-- Enable pg_cron for scheduled jobs
-- This migration enables the pg_cron extension and schedules the monthly points reset

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule monthly points reset job
-- Runs at 00:00 UTC on the 1st of every month
-- This resets current_month_points to 0 for all users
SELECT cron.schedule(
    'monthly-points-reset',           -- job name
    '0 0 1 * *',                      -- cron expression: minute 0, hour 0, day 1, every month
    $$SELECT public.reset_monthly_points()$$
);

-- To view scheduled jobs: SELECT * FROM cron.job;
-- To unschedule: SELECT cron.unschedule('monthly-points-reset');

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - Used for monthly points reset';
