-- Enable REPLICA IDENTITY FULL for real-time updates
ALTER TABLE public.order_items REPLICA IDENTITY FULL;

-- Add order_items to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;