-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Users can update their own deposits" ON public.deposit_addresses;

-- Create a new policy that allows users to cancel their own pending deposits
CREATE POLICY "Users can update their own pending deposits"
ON public.deposit_addresses
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'cancelled', 'expired'));