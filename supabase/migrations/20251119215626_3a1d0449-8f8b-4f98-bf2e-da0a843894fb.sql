-- Add balance_credits column to wallet_balances
ALTER TABLE public.wallet_balances
ADD COLUMN IF NOT EXISTS balance_credits INTEGER NOT NULL DEFAULT 0;

-- Create credit_purchases table
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_amount INTEGER NOT NULL,
  eur_amount NUMERIC(10, 2) NOT NULL,
  payment_provider TEXT NOT NULL DEFAULT 'nowpayments',
  payment_id TEXT,
  payment_url TEXT,
  crypto_currency TEXT,
  crypto_amount NUMERIC(18, 8),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'expired', 'failed', 'cancelled'))
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_payment_id ON public.credit_purchases(payment_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON public.credit_purchases(status);

-- Enable RLS on credit_purchases
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_purchases
CREATE POLICY "Users can view their own credit purchases"
  ON public.credit_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit purchases"
  ON public.credit_purchases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update credit purchases"
  ON public.credit_purchases
  FOR UPDATE
  USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER update_credit_purchases_updated_at
  BEFORE UPDATE ON public.credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create credit_transactions table for history
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  related_purchase_id UUID REFERENCES public.credit_purchases(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_transaction_type CHECK (type IN ('purchase', 'order_payment', 'order_refund', 'sale_received', 'admin_adjustment'))
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);

-- Enable RLS on credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_transactions
CREATE POLICY "Users can view their own credit transactions"
  ON public.credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert credit transactions"
  ON public.credit_transactions
  FOR INSERT
  WITH CHECK (true);