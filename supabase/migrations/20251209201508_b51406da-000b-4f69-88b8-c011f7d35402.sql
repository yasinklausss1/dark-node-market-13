-- Add buyer_notes_images column to orders table for buyer image attachments
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS buyer_notes_images TEXT[] DEFAULT '{}';

-- Add digital_content_images column to order_items table for seller image attachments
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS digital_content_images TEXT[] DEFAULT '{}';