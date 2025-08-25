-- Create missing tables that were in the original database

-- Table for user wallets/balances
CREATE TABLE public.user_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);

-- Table for admin notifications
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for system settings
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for audit logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for crypto addresses
CREATE TABLE public.crypto_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  currency TEXT NOT NULL,
  address TEXT NOT NULL,
  private_key_encrypted TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for product images
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for shipping methods
CREATE TABLE public.shipping_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  estimated_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for coupons/discounts
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  minimum_amount DECIMAL(10,2),
  maximum_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for coupon usage
CREATE TABLE public.coupon_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for news/announcements
CREATE TABLE public.news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
-- User wallets policies
CREATE POLICY "Users can view their own wallets" ON public.user_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own wallets" ON public.user_wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can manage wallets" ON public.user_wallets FOR ALL USING (true);

-- Admin notifications policies
CREATE POLICY "Admins can view all notifications" ON public.admin_notifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage notifications" ON public.admin_notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- System settings policies
CREATE POLICY "Admins can view settings" ON public.system_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage settings" ON public.system_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Audit logs policies
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "System can create audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Crypto addresses policies
CREATE POLICY "Users can view their own addresses" ON public.crypto_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own addresses" ON public.crypto_addresses FOR ALL USING (auth.uid() = user_id);

-- Product images policies
CREATE POLICY "Product images are viewable by everyone" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Sellers can manage their product images" ON public.product_images FOR ALL USING (
  EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND seller_id = auth.uid())
);

-- Shipping methods policies
CREATE POLICY "Shipping methods are viewable by everyone" ON public.shipping_methods FOR SELECT USING (true);
CREATE POLICY "Admins can manage shipping methods" ON public.shipping_methods FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Coupons policies
CREATE POLICY "Coupons are viewable by everyone" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Coupon usage policies
CREATE POLICY "Users can view their own coupon usage" ON public.coupon_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create coupon usage" ON public.coupon_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- News policies
CREATE POLICY "Published news is viewable by everyone" ON public.news FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage news" ON public.news FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create update triggers for new tables
CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON public.user_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX idx_admin_notifications_user_id ON public.admin_notifications(user_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_crypto_addresses_user_id ON public.crypto_addresses(user_id);
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_coupon_usage_coupon_id ON public.coupon_usage(coupon_id);
CREATE INDEX idx_coupon_usage_user_id ON public.coupon_usage(user_id);
CREATE INDEX idx_news_author_id ON public.news(author_id);

-- Now create the missing database functions

-- Function to get user balance
CREATE OR REPLACE FUNCTION public.get_user_balance(p_user_id UUID, p_currency TEXT DEFAULT 'EUR')
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_balance DECIMAL(10,2);
BEGIN
  SELECT balance INTO user_balance
  FROM public.user_wallets
  WHERE user_id = p_user_id AND currency = p_currency;
  
  RETURN COALESCE(user_balance, 0.00);
END;
$$;

-- Function to update user balance
CREATE OR REPLACE FUNCTION public.update_user_balance(
  p_user_id UUID,
  p_amount DECIMAL(10,2),
  p_currency TEXT DEFAULT 'EUR',
  p_transaction_type TEXT DEFAULT 'adjustment'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update user wallet
  INSERT INTO public.user_wallets (user_id, balance, currency)
  VALUES (p_user_id, p_amount, p_currency)
  ON CONFLICT (user_id, currency)
  DO UPDATE SET
    balance = user_wallets.balance + p_amount,
    updated_at = now();
    
  -- Create transaction record
  INSERT INTO public.transactions (user_id, type, amount, currency, status, description)
  VALUES (p_user_id, p_transaction_type::transaction_type, p_amount, p_currency, 'completed', 'Balance adjustment');
  
  RETURN true;
END;
$$;

-- Function to create audit log
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  )
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN (OLD.id)::UUID
      ELSE (NEW.id)::UUID
    END,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    now()
  );
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Function to calculate order total with discounts
CREATE OR REPLACE FUNCTION public.calculate_order_total(p_order_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_total DECIMAL(10,2);
  discount_amount DECIMAL(10,2) := 0;
  final_total DECIMAL(10,2);
BEGIN
  -- Calculate base total from order items
  SELECT SUM(total_price) INTO base_total
  FROM public.order_items
  WHERE order_id = p_order_id;
  
  -- Calculate coupon discounts
  SELECT COALESCE(SUM(discount_amount), 0) INTO discount_amount
  FROM public.coupon_usage
  WHERE order_id = p_order_id;
  
  final_total := GREATEST(base_total - discount_amount, 0);
  
  RETURN final_total;
END;
$$;

-- Function to validate coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code TEXT, p_user_id UUID, p_order_total DECIMAL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  coupon_record RECORD;
  usage_count INTEGER;
  discount_amount DECIMAL(10,2);
  result JSONB;
BEGIN
  -- Get coupon details
  SELECT * INTO coupon_record
  FROM public.coupons
  WHERE code = p_code AND is_active = true
  AND (valid_from <= now() AND (valid_until IS NULL OR valid_until >= now()));
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid or expired coupon');
  END IF;
  
  -- Check usage limit
  SELECT COUNT(*) INTO usage_count
  FROM public.coupon_usage
  WHERE coupon_id = coupon_record.id;
  
  IF coupon_record.maximum_uses IS NOT NULL AND usage_count >= coupon_record.maximum_uses THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Coupon usage limit exceeded');
  END IF;
  
  -- Check minimum amount
  IF coupon_record.minimum_amount IS NOT NULL AND p_order_total < coupon_record.minimum_amount THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Order total does not meet minimum requirement');
  END IF;
  
  -- Calculate discount
  IF coupon_record.discount_type = 'percentage' THEN
    discount_amount := p_order_total * (coupon_record.discount_value / 100);
  ELSE
    discount_amount := coupon_record.discount_value;
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'discount_amount', discount_amount,
    'coupon_id', coupon_record.id
  );
END;
$$;

-- Function to process order payment
CREATE OR REPLACE FUNCTION public.process_order_payment(
  p_order_id UUID,
  p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record RECORD;
  user_balance DECIMAL(10,2);
  result JSONB;
BEGIN
  -- Get order details
  SELECT * INTO order_record
  FROM public.orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found');
  END IF;
  
  IF p_payment_method = 'balance' THEN
    -- Check user balance
    SELECT balance INTO user_balance
    FROM public.user_wallets
    WHERE user_id = order_record.buyer_id AND currency = 'EUR';
    
    IF COALESCE(user_balance, 0) < order_record.total_amount THEN
      RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance');
    END IF;
    
    -- Deduct from balance
    PERFORM public.update_user_balance(
      order_record.buyer_id,
      -order_record.total_amount,
      'EUR',
      'purchase'
    );
    
    -- Update order status
    UPDATE public.orders
    SET status = 'processing'
    WHERE id = p_order_id;
    
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Payment processed successfully');
END;
$$;

-- Function to get seller statistics
CREATE OR REPLACE FUNCTION public.get_seller_stats(p_seller_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_sales DECIMAL(10,2);
  total_orders INTEGER;
  active_products INTEGER;
  avg_rating DECIMAL(3,2);
BEGIN
  -- Calculate total sales
  SELECT COALESCE(SUM(oi.total_price), 0) INTO total_sales
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.seller_id = p_seller_id AND o.status IN ('delivered', 'completed');
  
  -- Count total orders
  SELECT COUNT(DISTINCT oi.order_id) INTO total_orders
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.seller_id = p_seller_id;
  
  -- Count active products
  SELECT COUNT(*) INTO active_products
  FROM public.products
  WHERE seller_id = p_seller_id AND is_active = true;
  
  -- Calculate average rating
  SELECT COALESCE(AVG(rating), 0) INTO avg_rating
  FROM public.reviews
  WHERE reviewed_user_id = p_seller_id;
  
  RETURN jsonb_build_object(
    'total_sales', total_sales,
    'total_orders', total_orders,
    'active_products', active_products,
    'avg_rating', avg_rating
  );
END;
$$;

-- Function to get user dashboard data
CREATE OR REPLACE FUNCTION public.get_user_dashboard(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wallet_balance DECIMAL(10,2);
  pending_orders INTEGER;
  recent_transactions INTEGER;
  unread_messages INTEGER;
BEGIN
  -- Get wallet balance
  SELECT COALESCE(balance, 0) INTO wallet_balance
  FROM public.user_wallets
  WHERE user_id = p_user_id AND currency = 'EUR';
  
  -- Count pending orders
  SELECT COUNT(*) INTO pending_orders
  FROM public.orders
  WHERE buyer_id = p_user_id AND status IN ('pending', 'processing');
  
  -- Count recent transactions (last 30 days)
  SELECT COUNT(*) INTO recent_transactions
  FROM public.transactions
  WHERE user_id = p_user_id AND created_at >= now() - interval '30 days';
  
  -- Count unread messages
  SELECT COUNT(*) INTO unread_messages
  FROM public.chat_messages cm
  JOIN public.conversations c ON c.id = cm.conversation_id
  WHERE (c.buyer_id = p_user_id OR c.seller_id = p_user_id)
  AND cm.sender_id != p_user_id
  AND cm.is_read = false;
  
  RETURN jsonb_build_object(
    'wallet_balance', wallet_balance,
    'pending_orders', pending_orders,
    'recent_transactions', recent_transactions,
    'unread_messages', unread_messages
  );
END;
$$;

-- Function to generate crypto address
CREATE OR REPLACE FUNCTION public.generate_crypto_address(
  p_user_id UUID,
  p_currency TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_address TEXT;
BEGIN
  -- Generate a mock address (in real implementation, this would call an external service)
  CASE p_currency
    WHEN 'BTC' THEN
      new_address := '1' || encode(gen_random_bytes(20), 'hex');
    WHEN 'LTC' THEN
      new_address := 'L' || encode(gen_random_bytes(20), 'hex');
    ELSE
      new_address := encode(gen_random_bytes(25), 'hex');
  END CASE;
  
  -- Store the address
  INSERT INTO public.crypto_addresses (user_id, currency, address)
  VALUES (p_user_id, p_currency, new_address);
  
  RETURN new_address;
END;
$$;

-- Function to check product availability
CREATE OR REPLACE FUNCTION public.check_product_availability(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  SELECT stock INTO current_stock
  FROM public.products
  WHERE id = p_product_id AND is_active = true;
  
  RETURN COALESCE(current_stock, 0) >= p_quantity;
END;
$$;

-- Function to update product stock
CREATE OR REPLACE FUNCTION public.update_product_stock(
  p_product_id UUID,
  p_quantity_change INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET stock = stock + p_quantity_change,
      updated_at = now()
  WHERE id = p_product_id
  AND (stock + p_quantity_change) >= 0;
  
  RETURN FOUND;
END;
$$;

-- Function to get popular products
CREATE OR REPLACE FUNCTION public.get_popular_products(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  product_id UUID,
  title TEXT,
  price DECIMAL(10,2),
  image_url TEXT,
  total_sold INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.price,
    p.image_url,
    COALESCE(SUM(oi.quantity)::INTEGER, 0) as total_sold
  FROM public.products p
  LEFT JOIN public.order_items oi ON oi.product_id = p.id
  LEFT JOIN public.orders o ON o.id = oi.order_id
  WHERE p.is_active = true
  AND (o.status IS NULL OR o.status IN ('delivered', 'completed'))
  GROUP BY p.id, p.title, p.price, p.image_url
  ORDER BY total_sold DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to search products
CREATE OR REPLACE FUNCTION public.search_products(
  p_search_term TEXT,
  p_category_id UUID DEFAULT NULL,
  p_min_price DECIMAL DEFAULT NULL,
  p_max_price DECIMAL DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  product_id UUID,
  title TEXT,
  description TEXT,
  price DECIMAL(10,2),
  image_url TEXT,
  seller_username TEXT,
  category_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.price,
    p.image_url,
    pr.username,
    c.name
  FROM public.products p
  JOIN public.profiles pr ON pr.user_id = p.seller_id
  LEFT JOIN public.categories c ON c.id = p.category_id
  WHERE p.is_active = true
  AND (p_search_term IS NULL OR 
       p.title ILIKE '%' || p_search_term || '%' OR 
       p.description ILIKE '%' || p_search_term || '%')
  AND (p_category_id IS NULL OR p.category_id = p_category_id)
  AND (p_min_price IS NULL OR p.price >= p_min_price)
  AND (p_max_price IS NULL OR p.price <= p_max_price)
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get order details with items
CREATE OR REPLACE FUNCTION public.get_order_details(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_data JSONB;
  items_data JSONB;
BEGIN
  -- Get order information
  SELECT to_jsonb(o.*) INTO order_data
  FROM public.orders o
  WHERE o.id = p_order_id;
  
  -- Get order items with product details
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'total_price', oi.total_price,
      'product', jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'image_url', p.image_url
      ),
      'seller', jsonb_build_object(
        'id', pr.id,
        'username', pr.username
      )
    )
  ) INTO items_data
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  JOIN public.profiles pr ON pr.user_id = oi.seller_id
  WHERE oi.order_id = p_order_id;
  
  RETURN jsonb_build_object(
    'order', order_data,
    'items', COALESCE(items_data, '[]'::jsonb)
  );
END;
$$;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    'user'
  );
  
  -- Create initial wallet
  INSERT INTO public.user_wallets (user_id, balance, currency)
  VALUES (new.id, 0.00, 'EUR');
  
  -- Create initial presence record
  INSERT INTO public.user_presence (user_id, is_online, last_seen)
  VALUES (new.id, false, now());
  
  RETURN new;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to clean up expired deposit requests
CREATE OR REPLACE FUNCTION public.cleanup_expired_deposits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.deposit_requests
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$;

-- Function to get conversation with messages
CREATE OR REPLACE FUNCTION public.get_conversation_with_messages(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_data JSONB;
  messages_data JSONB;
BEGIN
  -- Get conversation details
  SELECT to_jsonb(c.*) INTO conversation_data
  FROM public.conversations c
  WHERE c.id = p_conversation_id;
  
  -- Get messages with sender info
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', cm.id,
      'content', cm.content,
      'is_read', cm.is_read,
      'created_at', cm.created_at,
      'sender', jsonb_build_object(
        'id', p.id,
        'username', p.username
      )
    ) ORDER BY cm.created_at ASC
  ) INTO messages_data
  FROM public.chat_messages cm
  JOIN public.profiles p ON p.user_id = cm.sender_id
  WHERE cm.conversation_id = p_conversation_id;
  
  RETURN jsonb_build_object(
    'conversation', conversation_data,
    'messages', COALESCE(messages_data, '[]'::jsonb)
  );
END;
$$;