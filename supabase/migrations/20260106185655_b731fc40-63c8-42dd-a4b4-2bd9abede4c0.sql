-- Schedule sweep-deposits cron job to run hourly at minute 30
SELECT cron.schedule(
  'sweep-deposits-cron',
  '30 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://iqeubhhqdurqoaxnnyng.supabase.co/functions/v1/sweep-deposits',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZXViaGhxZHVycW9heG5ueW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDQyOTksImV4cCI6MjA2OTAyMDI5OX0.r2GZmcITEN4KuC6woCLnPEMgZTdBrOAZv2IFovedoBs"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);