-- Create a function to cleanup old referral codes, keeping only the latest one per user
CREATE OR REPLACE FUNCTION cleanup_old_referral_codes()
RETURNS TABLE(user_id UUID, deleted_count INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record RECORD;
  codes_to_delete UUID[];
  affected_user UUID;
  delete_count INTEGER;
BEGIN
  -- For each user with multiple codes
  FOR code_record IN (
    SELECT rc.user_id, COUNT(*) as total
    FROM referral_codes rc
    GROUP BY rc.user_id
    HAVING COUNT(*) > 1
  ) LOOP
    -- Get all code IDs except the latest one
    SELECT array_agg(id) INTO codes_to_delete
    FROM (
      SELECT id
      FROM referral_codes
      WHERE referral_codes.user_id = code_record.user_id
      ORDER BY created_at DESC
      OFFSET 1  -- Skip the latest one
    ) old_codes;
    
    -- Delete the old codes
    IF codes_to_delete IS NOT NULL THEN
      DELETE FROM referral_codes
      WHERE id = ANY(codes_to_delete);
      
      GET DIAGNOSTICS delete_count = ROW_COUNT;
      
      -- Return the result
      user_id := code_record.user_id;
      deleted_count := delete_count;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Execute the cleanup
SELECT * FROM cleanup_old_referral_codes();
