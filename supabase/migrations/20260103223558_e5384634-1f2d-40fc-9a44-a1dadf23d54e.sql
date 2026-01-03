-- Update LTC minimum withdrawal amount from 10 EUR to 5 EUR
UPDATE public.withdrawal_fees 
SET min_amount_eur = 5.00, updated_at = now() 
WHERE currency = 'LTC';