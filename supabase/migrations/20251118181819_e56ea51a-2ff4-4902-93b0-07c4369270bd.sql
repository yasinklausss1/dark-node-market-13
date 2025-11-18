-- Add ETH to the allowed currencies in deposit_requests
ALTER TABLE public.deposit_requests 
DROP CONSTRAINT IF EXISTS deposit_requests_currency_check;

ALTER TABLE public.deposit_requests 
ADD CONSTRAINT deposit_requests_currency_check 
CHECK (currency IN ('BTC', 'LTC', 'ETH', 'XMR'));