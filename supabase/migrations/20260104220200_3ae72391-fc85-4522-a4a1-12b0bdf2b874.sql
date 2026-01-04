
-- Korrigiere balance_ltc_deposited für eindiktator
-- Die echten LTC-Einzahlungen waren: 0.07270187 + 0.09517185 = 0.16787372 LTC
UPDATE wallet_balances 
SET balance_ltc_deposited = 0.16787372
WHERE user_id = '86333036-db78-4661-ae7b-baa5af6fa281';
