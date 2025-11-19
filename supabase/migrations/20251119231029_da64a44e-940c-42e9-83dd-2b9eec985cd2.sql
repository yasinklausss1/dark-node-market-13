-- Delete all credit transactions
DELETE FROM credit_transactions;

-- Reset all credit balances to 0
UPDATE wallet_balances SET balance_credits = 0;