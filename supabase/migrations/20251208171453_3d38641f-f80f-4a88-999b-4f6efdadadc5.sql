-- Add product_type column to categories table
ALTER TABLE public.categories 
ADD COLUMN product_type text NOT NULL DEFAULT 'physical';

-- Add check constraint
ALTER TABLE public.categories 
ADD CONSTRAINT categories_product_type_check 
CHECK (product_type IN ('physical', 'digital'));