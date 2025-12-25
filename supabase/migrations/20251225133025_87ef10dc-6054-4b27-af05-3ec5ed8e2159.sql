-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule auto-release escrow check every 15 minutes
SELECT cron.schedule(
  'auto-release-escrow-job',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://iqeubhhqdurqoaxnnyng.supabase.co/functions/v1/auto-release-escrow',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZXViaGhxZHVycW9heG5ueW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDQyOTksImV4cCI6MjA2OTAyMDI5OX0.r2GZmcITEN4KuC6woCLnPEMgZTdBrOAZv2IFovedoBs"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);