-- Add sweep tracking columns to deposit_addresses
ALTER TABLE public.deposit_addresses 
ADD COLUMN IF NOT EXISTS swept_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sweep_tx_hash TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS swept_amount NUMERIC(20, 8) DEFAULT NULL;

-- Create index for efficient sweep queries
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_sweep_status 
ON public.deposit_addresses (status, swept_at) 
WHERE status = 'completed' AND swept_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.deposit_addresses.swept_at IS 'Timestamp when funds were swept to pool';
COMMENT ON COLUMN public.deposit_addresses.sweep_tx_hash IS 'Transaction hash of the sweep transaction';
COMMENT ON COLUMN public.deposit_addresses.swept_amount IS 'Amount actually swept (after network fees)';