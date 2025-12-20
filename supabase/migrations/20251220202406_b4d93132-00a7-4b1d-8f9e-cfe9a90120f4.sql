-- Schritt 1: Sofortige Bereinigung - Lösche alte Cron-Logs (älter als 7 Tage)
DELETE FROM cron.job_run_details WHERE end_time < NOW() - INTERVAL '7 days';

-- Schritt 2: Lösche alte HTTP-Response-Logs (älter als 7 Tage)
DELETE FROM net._http_response WHERE created < NOW() - INTERVAL '7 days';

-- Schritt 3: Erstelle automatisches tägliches Cleanup (um 3:00 Uhr)
SELECT cron.schedule(
  'cleanup-old-cron-logs',
  '0 3 * * *',
  $$
  DELETE FROM cron.job_run_details WHERE end_time < NOW() - INTERVAL '7 days';
  DELETE FROM net._http_response WHERE created < NOW() - INTERVAL '7 days';
  $$
);