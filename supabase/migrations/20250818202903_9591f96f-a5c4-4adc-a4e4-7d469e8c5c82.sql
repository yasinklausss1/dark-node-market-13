-- Make product-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'product-images';

-- Create RLS policies for product images
-- Allow authenticated users to view product images
CREATE POLICY "Authenticated users can view product images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
);

-- Allow sellers to upload images for their products
CREATE POLICY "Sellers can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
  AND get_user_role(auth.uid()) IN ('seller', 'admin')
);

-- Allow sellers to update their own product images
CREATE POLICY "Sellers can update their own product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
  AND get_user_role(auth.uid()) IN ('seller', 'admin')
);

-- Allow sellers to delete their own product images
CREATE POLICY "Sellers can delete their own product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
  AND get_user_role(auth.uid()) IN ('seller', 'admin')
);