-- Add digital_content field to order_items for per-order delivery
ALTER TABLE public.order_items 
ADD COLUMN digital_content TEXT DEFAULT NULL;

-- Add digital_content_delivered_at timestamp to track when seller delivered
ALTER TABLE public.order_items 
ADD COLUMN digital_content_delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Allow sellers to update digital content on their order items
CREATE POLICY "Sellers can update digital content on their order items"
ON public.order_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = order_items.product_id
    AND p.seller_id = auth.uid()
  )
);