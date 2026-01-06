-- Deaktiviere/lösche alte Cron-Jobs die nicht mehr benötigt werden
SELECT cron.unschedule('check-btc-deposits');
SELECT cron.unschedule('check-ltc-deposits');
SELECT cron.unschedule('expire-deposit-requests');
SELECT cron.unschedule('auto-release-escrow-job');