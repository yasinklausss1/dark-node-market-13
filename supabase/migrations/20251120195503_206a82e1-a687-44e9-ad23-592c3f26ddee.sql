-- Add delivered_at and read_at columns to chat_messages table
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Update existing messages to set delivered_at to created_at
UPDATE public.chat_messages
SET delivered_at = created_at
WHERE delivered_at IS NULL;

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_status 
ON public.chat_messages(conversation_id, delivered_at, read_at);

-- Update the trigger to automatically set delivered_at for new messages
CREATE OR REPLACE FUNCTION public.set_message_delivered()
RETURNS TRIGGER AS $$
BEGIN
  NEW.delivered_at = NEW.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_chat_message_delivered
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_message_delivered();