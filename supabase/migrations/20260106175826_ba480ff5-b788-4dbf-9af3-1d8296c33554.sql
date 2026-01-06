-- Add escrow_audit_log table for complete audit trail
CREATE TABLE IF NOT EXISTS public.escrow_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escrow_holding_id UUID REFERENCES public.escrow_holdings(id),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  action TEXT NOT NULL, -- 'created', 'funded', 'released', 'refunded', 'disputed', 'admin_released', 'auto_released'
  actor_id UUID NOT NULL, -- who performed the action
  actor_type TEXT NOT NULL, -- 'buyer', 'seller', 'admin', 'system'
  previous_status TEXT,
  new_status TEXT,
  amount_btc NUMERIC DEFAULT 0,
  amount_ltc NUMERIC DEFAULT 0,
  amount_eur NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on escrow_audit_log
ALTER TABLE public.escrow_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit logs for their own orders
CREATE POLICY "Users can view their own order audit logs"
ON public.escrow_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = escrow_audit_log.order_id
    AND (o.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.escrow_holdings eh
      WHERE eh.order_id = o.id AND eh.seller_id = auth.uid()
    ))
  )
);

-- Policy: Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.escrow_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_escrow_audit_log_order_id ON public.escrow_audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_audit_log_escrow_holding_id ON public.escrow_audit_log(escrow_holding_id);
CREATE INDEX IF NOT EXISTS idx_escrow_audit_log_created_at ON public.escrow_audit_log(created_at DESC);

-- Add escrow_wallet_pool table for platform escrow addresses
CREATE TABLE IF NOT EXISTS public.escrow_wallet_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency TEXT NOT NULL CHECK (currency IN ('BTC', 'LTC')),
  address TEXT NOT NULL UNIQUE,
  private_key_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  total_held_btc NUMERIC DEFAULT 0,
  total_held_ltc NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS - only admins can access
ALTER TABLE public.escrow_wallet_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view escrow pool"
ON public.escrow_wallet_pool
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Add payment_status enum-like column to orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
    ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (
      payment_status IN ('pending', 'escrow_funded', 'released', 'refunded', 'cancelled')
    );
  END IF;
END $$;