-- Add RLS policies for email_verification_codes table
-- Allow system/edge functions to insert verification codes
CREATE POLICY "System can insert verification codes"
ON public.email_verification_codes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow system to update verification codes (for marking as verified)
CREATE POLICY "System can update verification codes"
ON public.email_verification_codes
FOR UPDATE
TO anon, authenticated
USING (true);

-- Allow system to select verification codes for validation
CREATE POLICY "System can select verification codes"
ON public.email_verification_codes
FOR SELECT
TO anon, authenticated
USING (true);