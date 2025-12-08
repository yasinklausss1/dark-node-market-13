-- Add digital_content column to products for storing digital product content (codes, links, etc.)
ALTER TABLE public.products 
ADD COLUMN digital_content TEXT DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.products.digital_content IS 'Content delivered to buyer after purchase (codes, links, text). Only visible to buyers after confirmed purchase.';