-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create reviews for their orders" ON public.reviews;

-- Create new policy that allows reviews for:
-- 1. Physical products when order_status = 'delivered'
-- 2. Digital products when digital_content_delivered_at is set
CREATE POLICY "Users can create reviews for their orders" 
ON public.reviews 
FOR INSERT 
WITH CHECK (
  (auth.uid() = reviewer_id) AND (
    -- Check if the order belongs to the user
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = reviews.order_id 
      AND o.user_id = auth.uid()
      AND (
        -- Physical product delivered
        o.order_status = 'delivered'
        -- OR digital product delivered
        OR EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = o.id
          AND oi.digital_content_delivered_at IS NOT NULL
        )
      )
    )
  )
);