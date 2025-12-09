-- Add product_id to reviews table for product-specific reviews
ALTER TABLE public.reviews 
ADD COLUMN product_id uuid REFERENCES public.products(id);

-- Create index for faster product-based queries
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);

-- Update trigger to handle product_id in seller ratings calculation
-- (seller ratings remain aggregated across all products)