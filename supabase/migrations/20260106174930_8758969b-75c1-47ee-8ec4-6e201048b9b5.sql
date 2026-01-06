-- Drop old deposit_requests table and recreate with better structure
DROP TABLE IF EXISTS public.deposit_requests CASCADE;

-- Create new deposit_addresses table for unique addresses per deposit
CREATE TABLE public.deposit_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('BTC', 'LTC')),
  address TEXT NOT NULL,
  private_key_encrypted TEXT,
  requested_amount_crypto NUMERIC(20, 8) NOT NULL,
  received_amount_crypto NUMERIC(20, 8) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'confirmed', 'completed', 'expired', 'cancelled')),
  tx_hash TEXT,
  confirmations INTEGER DEFAULT 0,
  required_confirmations INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deposit_addresses ENABLE ROW LEVEL SECURITY;

-- Users can view their own deposit addresses
CREATE POLICY "Users can view their own deposit addresses"
ON public.deposit_addresses
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create deposit addresses
CREATE POLICY "Users can create deposit addresses"
ON public.deposit_addresses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending deposits (cancel)
CREATE POLICY "Users can update their own deposits"
ON public.deposit_addresses
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Create index for faster lookups
CREATE INDEX idx_deposit_addresses_user_status ON public.deposit_addresses(user_id, status);
CREATE INDEX idx_deposit_addresses_address ON public.deposit_addresses(address);
CREATE INDEX idx_deposit_addresses_status ON public.deposit_addresses(status);

-- Trigger for updated_at
CREATE TRIGGER update_deposit_addresses_updated_at
BEFORE UPDATE ON public.deposit_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Recreate deposit_requests for backward compatibility (will be used as alias/view if needed)
CREATE TABLE public.deposit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  currency TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  crypto_amount NUMERIC(20, 8) NOT NULL DEFAULT 0,
  requested_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
  rate_locked NUMERIC(12, 2) NOT NULL DEFAULT 0,
  fingerprint INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  confirmations INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deposit requests"
ON public.deposit_requests FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create deposit requests"
ON public.deposit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deposit requests"
ON public.deposit_requests FOR UPDATE USING (auth.uid() = user_id);