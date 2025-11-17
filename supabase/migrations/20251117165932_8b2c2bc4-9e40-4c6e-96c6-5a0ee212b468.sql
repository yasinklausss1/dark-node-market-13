-- Remove the policy that blocks anonymous users from viewing products
DROP POLICY IF EXISTS "Block anonymous product access" ON public.products;