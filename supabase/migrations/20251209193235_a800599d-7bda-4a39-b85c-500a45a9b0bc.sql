-- Allow sellers to create new categories
CREATE POLICY "Sellers can create categories" 
ON public.categories 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow sellers to create new subcategories
CREATE POLICY "Sellers can create subcategories" 
ON public.subcategories 
FOR INSERT 
TO authenticated
WITH CHECK (true);