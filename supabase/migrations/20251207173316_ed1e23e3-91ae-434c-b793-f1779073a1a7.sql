-- Drop and recreate foreign keys with ON DELETE CASCADE

-- order_items -> orders
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- order_items -> products
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- orders -> profiles
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- products -> profiles (seller)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_seller_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_seller_id_fkey 
  FOREIGN KEY (seller_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- bitcoin_addresses -> profiles
ALTER TABLE public.bitcoin_addresses DROP CONSTRAINT IF EXISTS bitcoin_addresses_user_id_fkey;
ALTER TABLE public.bitcoin_addresses ADD CONSTRAINT bitcoin_addresses_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- wallet_balances -> profiles
ALTER TABLE public.wallet_balances DROP CONSTRAINT IF EXISTS wallet_balances_user_id_fkey;
ALTER TABLE public.wallet_balances ADD CONSTRAINT wallet_balances_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- transactions -> profiles
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- user_presence -> profiles
ALTER TABLE public.user_presence DROP CONSTRAINT IF EXISTS user_presence_user_id_fkey;
ALTER TABLE public.user_presence ADD CONSTRAINT user_presence_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- referral_codes -> profiles
ALTER TABLE public.referral_codes DROP CONSTRAINT IF EXISTS referral_codes_user_id_fkey;
ALTER TABLE public.referral_codes ADD CONSTRAINT referral_codes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- referral_rewards -> profiles (referrer)
ALTER TABLE public.referral_rewards DROP CONSTRAINT IF EXISTS referral_rewards_referrer_id_fkey;
ALTER TABLE public.referral_rewards ADD CONSTRAINT referral_rewards_referrer_id_fkey 
  FOREIGN KEY (referrer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- referral_rewards -> profiles (referred)
ALTER TABLE public.referral_rewards DROP CONSTRAINT IF EXISTS referral_rewards_referred_id_fkey;
ALTER TABLE public.referral_rewards ADD CONSTRAINT referral_rewards_referred_id_fkey 
  FOREIGN KEY (referred_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- reviews -> orders
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_order_id_fkey;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- disputes -> orders
ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_order_id_fkey;
ALTER TABLE public.disputes ADD CONSTRAINT disputes_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- dispute_messages -> disputes
ALTER TABLE public.dispute_messages DROP CONSTRAINT IF EXISTS dispute_messages_dispute_id_fkey;
ALTER TABLE public.dispute_messages ADD CONSTRAINT dispute_messages_dispute_id_fkey 
  FOREIGN KEY (dispute_id) REFERENCES public.disputes(id) ON DELETE CASCADE;

-- chat_messages -> conversations
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_conversation_id_fkey;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- product_images -> products
ALTER TABLE public.product_images DROP CONSTRAINT IF EXISTS product_images_product_id_fkey;
ALTER TABLE public.product_images ADD CONSTRAINT product_images_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- bulk_discounts -> products
ALTER TABLE public.bulk_discounts DROP CONSTRAINT IF EXISTS bulk_discounts_product_id_fkey;
ALTER TABLE public.bulk_discounts ADD CONSTRAINT bulk_discounts_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- credit_transactions -> orders
ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_related_order_id_fkey;
ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_related_order_id_fkey 
  FOREIGN KEY (related_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

-- credit_transactions -> credit_purchases
ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_related_purchase_id_fkey;
ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_related_purchase_id_fkey 
  FOREIGN KEY (related_purchase_id) REFERENCES public.credit_purchases(id) ON DELETE SET NULL;