-- Allow sellers to view order items for their products
CREATE POLICY "Sellers can view order items for their products"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = order_items.product_id 
    AND p.seller_id = auth.uid()
  )
);