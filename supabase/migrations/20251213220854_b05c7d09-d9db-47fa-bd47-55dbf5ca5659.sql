-- Add digital_content_files column to order_items for file attachments
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS digital_content_files text[] DEFAULT '{}'::text[];