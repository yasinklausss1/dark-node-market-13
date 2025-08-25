-- Add function to close conversation for users
CREATE OR REPLACE FUNCTION public.close_conversation(conversation_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is involved in this conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_uuid 
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Close the conversation
  UPDATE public.conversations
  SET status = 'closed', updated_at = now()
  WHERE id = conversation_uuid;
  
  RETURN TRUE;
END;
$function$