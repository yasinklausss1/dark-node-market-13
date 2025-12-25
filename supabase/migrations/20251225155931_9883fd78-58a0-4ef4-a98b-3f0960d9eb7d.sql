-- Drop old policy and create new one that allows both buyers and sellers to create disputes
DROP POLICY IF EXISTS "Users can create disputes for their orders" ON disputes;

CREATE POLICY "Buyers and sellers can create disputes"
ON disputes
FOR INSERT
WITH CHECK (
  -- Buyer creating dispute (plaintiff = buyer, defendant = seller)
  (
    auth.uid() = plaintiff_id
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = disputes.order_id
      AND orders.user_id = auth.uid()
    )
  )
  OR
  -- Seller creating dispute (plaintiff = seller, defendant = buyer)
  (
    auth.uid() = plaintiff_id
    AND EXISTS (
      SELECT 1 FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = disputes.order_id
      AND p.seller_id = auth.uid()
    )
  )
);