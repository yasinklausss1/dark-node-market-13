-- Schritt 1: TRUNCATE beider Tabellen (gibt Speicher sofort frei)
TRUNCATE TABLE net._http_response;
TRUNCATE TABLE cron.job_run_details;

-- Schritt 2: Lösche den alten Cleanup-Job und erstelle einen neuen mit 1-Stunden-Retention
SELECT cron.unschedule('cleanup-old-cron-logs');

SELECT cron.schedule(
  'cleanup-old-logs-hourly',
  '*/15 * * * *',
  $$
  DELETE FROM cron.job_run_details WHERE end_time < NOW() - INTERVAL '1 hour';
  DELETE FROM net._http_response WHERE created < NOW() - INTERVAL '1 hour';
  $$
);