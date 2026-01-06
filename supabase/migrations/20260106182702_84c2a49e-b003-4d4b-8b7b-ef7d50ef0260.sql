-- Add completed_at column to withdrawal_requests if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'withdrawal_requests' 
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.withdrawal_requests ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Drop old deposit_requests table (deprecated system)
DROP TABLE IF EXISTS public.deposit_requests CASCADE;

-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule old cron jobs that might be referencing deleted functions
SELECT cron.unschedule('check-user-deposits-every-minute') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-user-deposits-every-minute');
SELECT cron.unschedule('expire-deposit-requests-every-5-minutes') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-deposit-requests-every-5-minutes');

-- Schedule monitor-deposits to run every 2 minutes
SELECT cron.schedule(
  'monitor-deposits-cron',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url:='https://iqeubhhqdurqoaxnnyng.supabase.co/functions/v1/monitor-deposits',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZXViaGhxZHVycW9heG5ueW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDQyOTksImV4cCI6MjA2OTAyMDI5OX0.r2GZmcITEN4KuC6woCLnPEMgZTdBrOAZv2IFovedoBs"}'::jsonb,
    body:='{"triggered_by": "cron"}'::jsonb
  );
  $$
);

-- Schedule auto-release-escrow to run every hour
SELECT cron.schedule(
  'auto-release-escrow-cron',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://iqeubhhqdurqoaxnnyng.supabase.co/functions/v1/auto-release-escrow',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZXViaGhxZHVycW9heG5ueW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDQyOTksImV4cCI6MjA2OTAyMDI5OX0.r2GZmcITEN4KuC6woCLnPEMgZTdBrOAZv2IFovedoBs"}'::jsonb,
    body:='{"triggered_by": "cron"}'::jsonb
  );
  $$
);