-- Add unique constraint for user_id and currency combination in user_addresses
ALTER TABLE public.user_addresses DROP CONSTRAINT IF EXISTS user_addresses_user_id_currency_key;
ALTER TABLE public.user_addresses ADD CONSTRAINT user_addresses_user_id_currency_key UNIQUE (user_id, currency);

-- Add unique constraint for user_id in wallet_balances
ALTER TABLE public.wallet_balances DROP CONSTRAINT IF EXISTS wallet_balances_user_id_key;
ALTER TABLE public.wallet_balances ADD CONSTRAINT wallet_balances_user_id_key UNIQUE (user_id);

-- Update the create_user_addresses trigger function to be more robust
CREATE OR REPLACE FUNCTION public.create_user_addresses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert placeholder addresses only if they don't exist
  INSERT INTO public.user_addresses (user_id, currency, address, is_active) VALUES
    (NEW.id, 'BTC', 'pending', false),
    (NEW.id, 'LTC', 'pending', false)
  ON CONFLICT (user_id, currency) DO NOTHING;
  
  -- Create wallet balance entry
  INSERT INTO public.wallet_balances (user_id, balance_eur, balance_btc, balance_ltc, balance_btc_deposited, balance_ltc_deposited) 
  VALUES (NEW.id, 0, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created_addresses ON auth.users;
CREATE TRIGGER on_auth_user_created_addresses
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_addresses();