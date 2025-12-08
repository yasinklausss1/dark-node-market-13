-- Add product_type column to products table
ALTER TABLE public.products 
ADD COLUMN product_type text NOT NULL DEFAULT 'physical';

-- Add comment for clarity
COMMENT ON COLUMN public.products.product_type IS 'Type of product: physical (requires shipping) or digital (no shipping required)';