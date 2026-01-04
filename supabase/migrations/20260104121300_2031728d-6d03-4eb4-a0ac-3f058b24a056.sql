-- Add amount_ltc column to transactions table for proper LTC tracking
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS amount_ltc numeric DEFAULT 0;

-- Add comment explaining the column usage
COMMENT ON COLUMN public.transactions.amount_ltc IS 'LTC amount for transactions - separate from BTC';
COMMENT ON COLUMN public.transactions.amount_btc IS 'BTC amount for transactions only';