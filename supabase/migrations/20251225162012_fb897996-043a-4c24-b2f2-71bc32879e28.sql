-- Enable REPLICA IDENTITY FULL for dispute_messages to capture complete row data
ALTER TABLE public.dispute_messages REPLICA IDENTITY FULL;

-- Enable REPLICA IDENTITY FULL for disputes table as well
ALTER TABLE public.disputes REPLICA IDENTITY FULL;

-- Add both tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_messages;