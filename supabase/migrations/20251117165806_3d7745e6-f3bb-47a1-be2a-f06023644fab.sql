-- Allow everyone (including guests/unauthenticated users) to view active products
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (is_active = true);