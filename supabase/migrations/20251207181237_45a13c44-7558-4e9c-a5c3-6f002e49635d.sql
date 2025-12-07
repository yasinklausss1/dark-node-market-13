-- Add unique constraint on user_addresses for proper upsert functionality
ALTER TABLE public.user_addresses 
DROP CONSTRAINT IF EXISTS user_addresses_user_id_currency_key;

ALTER TABLE public.user_addresses 
ADD CONSTRAINT user_addresses_user_id_currency_key UNIQUE (user_id, currency);