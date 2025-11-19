-- Create product_images table for multiple images per product
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view product images
CREATE POLICY "Product images are viewable by everyone"
  ON public.product_images
  FOR SELECT
  USING (true);

-- Sellers can insert images for their own products
CREATE POLICY "Sellers can insert images for their products"
  ON public.product_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_id AND seller_id = auth.uid()
    )
  );

-- Sellers can update images for their own products
CREATE POLICY "Sellers can update images for their products"
  ON public.product_images
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_id AND seller_id = auth.uid()
    )
  );

-- Sellers can delete images for their own products
CREATE POLICY "Sellers can delete images for their products"
  ON public.product_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_id AND seller_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_images_display_order ON public.product_images(product_id, display_order);

-- Add trigger for updated_at
CREATE TRIGGER update_product_images_updated_at
  BEFORE UPDATE ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();