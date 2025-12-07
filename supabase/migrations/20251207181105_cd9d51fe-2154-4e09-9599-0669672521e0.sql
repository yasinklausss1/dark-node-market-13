-- Update the create_user_addresses function to insert pending placeholder addresses
-- Real addresses will be generated via edge function when user first accesses wallet

CREATE OR REPLACE FUNCTION public.create_user_addresses()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert placeholder "pending" addresses for new users
  -- Real addresses will be generated via edge function on first wallet access
  INSERT INTO public.user_addresses (user_id, currency, address, is_active, private_key_encrypted) VALUES
    (NEW.id, 'BTC', 'pending', true, NULL),
    (NEW.id, 'LTC', 'pending', true, NULL)
  ON CONFLICT (user_id, currency) DO NOTHING;
  
  -- Create wallet balance entry
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