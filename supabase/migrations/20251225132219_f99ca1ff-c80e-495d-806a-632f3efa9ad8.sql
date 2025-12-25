-- Platform Settings (escrow fee, auto-release days)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default escrow settings
INSERT INTO public.platform_settings (setting_key, setting_value, description) VALUES
  ('escrow_fee_percent', '1', 'Percentage fee taken from each sale'),
  ('auto_release_days_digital', '7', 'Days until auto-release for digital products'),
  ('auto_release_days_physical', '14', 'Days until auto-release for physical products');

-- Admin Fee Addresses (separate BTC/LTC for fees only)
CREATE TABLE IF NOT EXISTS public.admin_fee_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL DEFAULT 'b7f1a65f-4d3a-43a3-a3ac-6ca95aa5c959',
  currency text NOT NULL,
  address text NOT NULL,
  private_key_encrypted text,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_user_id, currency)
);

-- Escrow Holdings (funds held per order)
CREATE TABLE IF NOT EXISTS public.escrow_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  amount_eur numeric NOT NULL,
  amount_crypto numeric NOT NULL,
  currency text NOT NULL, -- 'btc' or 'ltc'
  fee_amount_eur numeric NOT NULL,
  fee_amount_crypto numeric NOT NULL,
  seller_amount_eur numeric NOT NULL,
  seller_amount_crypto numeric NOT NULL,
  status text NOT NULL DEFAULT 'held', -- held, released, refunded, disputed
  auto_release_at timestamptz NOT NULL,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Admin Fee Transactions (history of fees collected)
CREATE TABLE IF NOT EXISTS public.admin_fee_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_holding_id uuid REFERENCES public.escrow_holdings(id),
  order_id uuid NOT NULL,
  amount_eur numeric NOT NULL,
  amount_crypto numeric NOT NULL,
  currency text NOT NULL,
  transaction_type text NOT NULL DEFAULT 'fee_collected', -- fee_collected, withdrawal
  destination_address text,
  tx_hash text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add escrow columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_status text DEFAULT 'none';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_confirmed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS auto_release_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_currency text;

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_fee_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_fee_transactions ENABLE ROW LEVEL SECURITY;

-- Platform Settings Policies
CREATE POLICY "Anyone can view platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin Fee Addresses Policies (only ADMkz can see)
CREATE POLICY "Only main admin can view fee addresses"
  ON public.admin_fee_addresses FOR SELECT
  USING (auth.uid() = 'b7f1a65f-4d3a-43a3-a3ac-6ca95aa5c959'::uuid);

CREATE POLICY "System can manage fee addresses"
  ON public.admin_fee_addresses FOR ALL
  USING (true)
  WITH CHECK (true);

-- Escrow Holdings Policies
CREATE POLICY "Buyers can view their escrow holdings"
  ON public.escrow_holdings FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view their escrow holdings"
  ON public.escrow_holdings FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all escrow holdings"
  ON public.escrow_holdings FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage escrow holdings"
  ON public.escrow_holdings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admin Fee Transactions Policies
CREATE POLICY "Only main admin can view fee transactions"
  ON public.admin_fee_transactions FOR SELECT
  USING (auth.uid() = 'b7f1a65f-4d3a-43a3-a3ac-6ca95aa5c959'::uuid);

CREATE POLICY "System can insert fee transactions"
  ON public.admin_fee_transactions FOR INSERT
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_escrow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_escrow_holdings_updated_at
  BEFORE UPDATE ON public.escrow_holdings
  FOR EACH ROW EXECUTE FUNCTION update_escrow_updated_at();

CREATE TRIGGER update_admin_fee_addresses_updated_at
  BEFORE UPDATE ON public.admin_fee_addresses
  FOR EACH ROW EXECUTE FUNCTION update_escrow_updated_at();

CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_escrow_updated_at();