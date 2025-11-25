-- Add fansign_delivery_days column to products table
ALTER TABLE public.products 
ADD COLUMN fansign_delivery_days TEXT NOT NULL DEFAULT '1-2';

-- Add check constraint to ensure only valid values
ALTER TABLE public.products
ADD CONSTRAINT fansign_delivery_days_check 
CHECK (fansign_delivery_days IN ('1-2', '3', '1-4'));