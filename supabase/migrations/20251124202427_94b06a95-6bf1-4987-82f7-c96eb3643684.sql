-- Add fansign image columns to orders table
ALTER TABLE public.orders
ADD COLUMN fansign_image_url text,
ADD COLUMN fansign_uploaded_at timestamp with time zone;

-- Create fansign-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('fansign-images', 'fansign-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Sellers can upload fansign images for their orders
CREATE POLICY "Sellers can upload fansign images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fansign-images' AND
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    JOIN public.products p ON p.id = oi.product_id
    WHERE p.seller_id = auth.uid()
    AND o.id::text = (storage.foldername(name))[1]
  )
);

-- RLS Policy: Sellers can update fansign images for their orders
CREATE POLICY "Sellers can update fansign images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fansign-images' AND
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    JOIN public.products p ON p.id = oi.product_id
    WHERE p.seller_id = auth.uid()
    AND o.id::text = (storage.foldername(name))[1]
  )
);

-- RLS Policy: Buyers can view their fansign images
CREATE POLICY "Buyers can view their fansign images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'fansign-images' AND
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.user_id = auth.uid()
    AND o.id::text = (storage.foldername(name))[1]
  )
);

-- RLS Policy: Sellers can view fansign images for their orders
CREATE POLICY "Sellers can view their fansign images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'fansign-images' AND
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    JOIN public.products p ON p.id = oi.product_id
    WHERE p.seller_id = auth.uid()
    AND o.id::text = (storage.foldername(name))[1]
  )
);