-- Lösche restliche alte Cron-Jobs
SELECT cron.unschedule('invoke-check-btc-every-minute');
SELECT cron.unschedule('invoke-check-ltc-every-minute');
SELECT cron.unschedule('cleanup-old-logs-hourly');