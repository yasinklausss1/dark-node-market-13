-- Add verification_type column to support both registration and password reset
ALTER TABLE email_verification_codes 
ADD COLUMN IF NOT EXISTS verification_type text NOT NULL DEFAULT 'registration';

-- Update column to allow checking type
CREATE INDEX IF NOT EXISTS idx_verification_codes_type_email 
ON email_verification_codes(verification_type, email, expires_at);

COMMENT ON COLUMN email_verification_codes.verification_type IS 'Type of verification: registration or password_reset';