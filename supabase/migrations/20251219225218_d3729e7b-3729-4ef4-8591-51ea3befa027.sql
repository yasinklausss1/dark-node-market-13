-- Add RLS policies for admins to view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add RLS policy for admins to view all order items
CREATE POLICY "Admins can view all order items"
ON public.order_items
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add RLS policy for admins to view all deposit requests
CREATE POLICY "Admins can view all deposit requests"
ON public.deposit_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add RLS policy for admins to view all withdrawal requests
CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add RLS policy for admins to view all credit withdrawals
CREATE POLICY "Admins can view all credit withdrawals"
ON public.credit_withdrawals
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));