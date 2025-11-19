-- Create product_addons table
CREATE TABLE public.product_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  name TEXT NOT NULL,
  price_eur NUMERIC NOT NULL DEFAULT 0.00,
  is_required BOOLEAN NOT NULL DEFAULT false,
  addon_type TEXT NOT NULL DEFAULT 'checkbox',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;

-- Everyone can view product addons
CREATE POLICY "Everyone can view product addons"
ON public.product_addons
FOR SELECT
USING (true);

-- Sellers can manage their product addons
CREATE POLICY "Sellers can manage their product addons"
ON public.product_addons
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE products.id = product_addons.product_id
    AND (products.seller_id = auth.uid() OR get_user_role(auth.uid()) = 'admin')
  )
);

-- Create order_addon_selections table to store selected addons for orders
CREATE TABLE public.order_addon_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  order_item_id UUID NOT NULL,
  addon_id UUID NOT NULL,
  addon_name TEXT NOT NULL,
  price_eur NUMERIC NOT NULL,
  custom_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_addon_selections ENABLE ROW LEVEL SECURITY;

-- Users can view their own order addon selections
CREATE POLICY "Users can view their own order addon selections"
ON public.order_addon_selections
FOR SELECT
USING (
  auth.uid() IN (
    SELECT orders.user_id FROM orders WHERE orders.id = order_addon_selections.order_id
  )
);

-- Users can create order addon selections for their orders
CREATE POLICY "Users can create order addon selections"
ON public.order_addon_selections
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT orders.user_id FROM orders WHERE orders.id = order_addon_selections.order_id
  )
);