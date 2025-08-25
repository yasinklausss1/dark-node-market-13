-- Clear existing fake data and prepare for real crypto system
DELETE FROM user_addresses WHERE user_id = '0af916bb-1c03-4173-a898-fd4274ae4a2b';
DELETE FROM deposit_requests WHERE user_id = '0af916bb-1c03-4173-a898-fd4274ae4a2b';
DELETE FROM withdrawal_requests WHERE user_id = '0af916bb-1c03-4173-a898-fd4274ae4a2b';
DELETE FROM transactions WHERE user_id = '0af916bb-1c03-4173-a898-fd4274ae4a2b';

-- Reset wallet balance to zero (real system starts fresh)
UPDATE wallet_balances 
SET 
  balance_eur = 0.00,
  balance_btc = 0.00000000,
  balance_ltc = 0.00000000,
  balance_btc_deposited = 0.00000000,
  balance_ltc_deposited = 0.00000000,
  updated_at = NOW()
WHERE user_id = '0af916bb-1c03-4173-a898-fd4274ae4a2b';

-- Create proper withdrawal fees structure for real system
INSERT INTO withdrawal_fees (currency, base_fee_eur, percentage_fee, min_amount_eur, network_fee_crypto) VALUES
('BTC', 2.00, 0.015, 20.00, 0.00005000),
('LTC', 1.00, 0.010, 10.00, 0.00100000)
ON CONFLICT (currency) DO UPDATE SET
  base_fee_eur = EXCLUDED.base_fee_eur,
  percentage_fee = EXCLUDED.percentage_fee,
  min_amount_eur = EXCLUDED.min_amount_eur,
  network_fee_crypto = EXCLUDED.network_fee_crypto,
  updated_at = NOW();