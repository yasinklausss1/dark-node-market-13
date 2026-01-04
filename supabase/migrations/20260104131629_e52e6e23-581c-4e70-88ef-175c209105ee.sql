
-- Korrigiere eindiktator's LTC Balance auf den korrekten Wert
-- Neue Einzahlung war 0.07270187 LTC (5.34 EUR requested, 5.11 EUR actual)
UPDATE wallet_balances
SET 
  balance_ltc = 0.07270187,
  balance_ltc_deposited = 0.07270187,
  balance_eur = 5.11,
  updated_at = now()
WHERE user_id = '86333036-db78-4661-ae7b-baa5af6fa281';
