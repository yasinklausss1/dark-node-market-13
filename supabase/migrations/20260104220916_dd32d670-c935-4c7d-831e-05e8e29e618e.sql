
-- Data-Fix: korrigiere eindiktator LTC Balance + repariere falsch befüllte LTC-Transaktionen
-- User: 86333036-db78-4661-ae7b-baa5af6fa281

-- Erwartete verfügbare LTC:
-- Einzahlungen (processed_deposits): 0.07270187 + 0.09517185 = 0.16787372
-- Ausgaben (purchases): 0.09285344 + 0.042682355064421106 = 0.1355357950644211
-- Rest: 0.03233792493557889
UPDATE public.wallet_balances
SET balance_ltc = 0.03233792493557889,
    updated_at = now()
WHERE user_id = '86333036-db78-4661-ae7b-baa5af6fa281';

-- Repariere historische Transaktionszeilen, wo LTC fälschlich in amount_btc gespeichert wurde
UPDATE public.transactions
SET amount_ltc = amount_btc,
    amount_btc = 0
WHERE user_id = '86333036-db78-4661-ae7b-baa5af6fa281'
  AND amount_ltc = 0
  AND amount_btc <> 0
  AND description ILIKE '%LTC%';
