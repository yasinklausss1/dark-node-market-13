UPDATE wallet_balances 
SET 
  balance_btc = 0,
  balance_ltc = 0,
  balance_eur = 0,
  balance_btc_deposited = 0,
  balance_ltc_deposited = 0,
  balance_xmr = 0,
  balance_xmr_deposited = 0,
  balance_eth = 0,
  balance_eth_deposited = 0,
  balance_credits = 0,
  updated_at = now()
WHERE user_id = '22d8588f-1127-494b-8d31-919f19f7adc0'