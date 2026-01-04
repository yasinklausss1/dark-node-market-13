-- Reset all wallet balances to zero
UPDATE wallet_balances SET 
  balance_btc = 0, 
  balance_ltc = 0, 
  balance_eur = 0, 
  balance_eth = 0, 
  balance_xmr = 0,
  balance_btc_deposited = 0,
  balance_ltc_deposited = 0,
  balance_eth_deposited = 0;