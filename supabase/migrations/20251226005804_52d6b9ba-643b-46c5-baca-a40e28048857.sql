-- Add blockchain transaction tracking columns to escrow_holdings
ALTER TABLE public.escrow_holdings 
ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS blockchain_tx_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS blockchain_fee_satoshi BIGINT DEFAULT 0;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_escrow_holdings_tx_hash ON public.escrow_holdings(blockchain_tx_hash) WHERE blockchain_tx_hash IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.escrow_holdings.blockchain_tx_hash IS 'Transaction hash from blockchain (buyer to seller)';
COMMENT ON COLUMN public.escrow_holdings.blockchain_tx_status IS 'Status: pending, confirmed, failed';
COMMENT ON COLUMN public.escrow_holdings.blockchain_fee_satoshi IS 'Blockchain network fee in satoshi/litoshi';