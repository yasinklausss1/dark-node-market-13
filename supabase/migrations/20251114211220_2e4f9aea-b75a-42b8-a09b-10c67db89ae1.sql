-- First, update or delete any invalid currency entries
DELETE FROM public.user_addresses 
WHERE currency NOT IN ('BTC', 'LTC');

-- Now drop the old constraint
ALTER TABLE public.user_addresses DROP CONSTRAINT IF EXISTS user_addresses_currency_check;

-- Add a new check constraint that includes ETH
ALTER TABLE public.user_addresses 
ADD CONSTRAINT user_addresses_currency_check 
CHECK (currency IN ('BTC', 'LTC', 'ETH'));

-- Add Ethereum support to wallet_balances
ALTER TABLE public.wallet_balances
ADD COLUMN IF NOT EXISTS balance_eth numeric NOT NULL DEFAULT 0.00000000,
ADD COLUMN IF NOT EXISTS balance_eth_deposited numeric NOT NULL DEFAULT 0.00000000;

-- Update existing user_addresses to use shared addresses
UPDATE public.user_addresses
SET 
  address = CASE 
    WHEN currency = 'BTC' THEN 'bc1qmf5rvta2hf70qt3ruugf3gn03paftrnwj9w3c3'
    WHEN currency = 'LTC' THEN 'LR5uSHzGZeukqJub73oaTQHgQMGjyd2Dhx'
    ELSE address
  END,
  is_active = true,
  private_key_encrypted = NULL
WHERE currency IN ('BTC', 'LTC');

-- Add ETH addresses for existing users
INSERT INTO public.user_addresses (user_id, currency, address, is_active, private_key_encrypted)
SELECT DISTINCT user_id, 'ETH', '0xc52C1432de54fb2f1b65C939fD10fA375AFE43C8', true, NULL
FROM public.user_addresses
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_addresses ua2 
  WHERE ua2.user_id = user_addresses.user_id AND ua2.currency = 'ETH'
)
ON CONFLICT DO NOTHING;

-- Drop and recreate the create_user_addresses function to use shared addresses
DROP FUNCTION IF EXISTS public.create_user_addresses() CASCADE;

CREATE OR REPLACE FUNCTION public.create_user_addresses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Insert shared addresses for new users
  INSERT INTO public.user_addresses (user_id, currency, address, is_active, private_key_encrypted) VALUES
    (NEW.id, 'BTC', 'bc1qmf5rvta2hf70qt3ruugf3gn03paftrnwj9w3c3', true, NULL),
    (NEW.id, 'LTC', 'LR5uSHzGZeukqJub73oaTQHgQMGjyd2Dhx', true, NULL),
    (NEW.id, 'ETH', '0xc52C1432de54fb2f1b65C939fD10fA375AFE43C8', true, NULL)
  ON CONFLICT (user_id, currency) DO UPDATE SET
    address = EXCLUDED.address,
    is_active = true,
    private_key_encrypted = NULL;
  
  -- Create wallet balance entry with ETH support
  INSERT INTO public.wallet_balances (
    user_id, 
    balance_eur, 
    balance_btc, 
    balance_ltc,
    balance_eth,
    balance_btc_deposited, 
    balance_ltc_deposited,
    balance_eth_deposited
  ) 
  VALUES (NEW.id, 0, 0, 0, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_addresses ON auth.users;
CREATE TRIGGER on_auth_user_created_addresses
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_addresses();