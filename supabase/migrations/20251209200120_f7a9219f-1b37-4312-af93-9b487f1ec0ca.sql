-- Add buyer_notes column to orders table for digital product purchase notes/wishes
ALTER TABLE public.orders 
ADD COLUMN buyer_notes TEXT DEFAULT NULL;