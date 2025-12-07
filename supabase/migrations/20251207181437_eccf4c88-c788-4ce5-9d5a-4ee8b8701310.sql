-- Reset ADMkz user's BTC and LTC addresses to pending so new ones can be generated
UPDATE public.user_addresses 
SET address = 'pending', private_key_encrypted = NULL, updated_at = now()
WHERE user_id = '0af916bb-1c03-4173-a898-fd4274ae4a2b' 
AND currency IN ('BTC', 'LTC');