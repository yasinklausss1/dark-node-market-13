-- =============================================
-- ZENTRALISIERTES WALLET SYSTEM
-- =============================================

-- Tabelle für Deposit Memo-Codes
CREATE TABLE public.deposit_memos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  memo_code TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL CHECK (currency IN ('BTC', 'LTC')),
  requested_eur NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  tx_hash TEXT,
  amount_received NUMERIC,
  rate_at_receive NUMERIC,
  eur_credited NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Index für schnelles Memo-Lookup
CREATE INDEX idx_deposit_memos_memo_code ON public.deposit_memos(memo_code);
CREATE INDEX idx_deposit_memos_user_status ON public.deposit_memos(user_id, status);
CREATE INDEX idx_deposit_memos_status ON public.deposit_memos(status);

-- RLS aktivieren
ALTER TABLE public.deposit_memos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own deposit memos"
  ON public.deposit_memos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deposit memos"
  ON public.deposit_memos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update deposit memos"
  ON public.deposit_memos FOR UPDATE
  USING (true);

CREATE POLICY "Admins can view all deposit memos"
  ON public.deposit_memos FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabelle für zentrale Platform-Adressen (falls nicht existiert, erweitern)
-- Wir nutzen admin_fee_addresses als zentrale Wallet

-- Tabelle für verarbeitete Transaktionen (verhindert Duplikate)
CREATE TABLE public.processed_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tx_hash TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL,
  amount_crypto NUMERIC NOT NULL,
  amount_eur NUMERIC NOT NULL,
  user_id UUID REFERENCES public.profiles(user_id),
  deposit_memo_id UUID REFERENCES public.deposit_memos(id),
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_processed_deposits_tx_hash ON public.processed_deposits(tx_hash);

ALTER TABLE public.processed_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view processed deposits"
  ON public.processed_deposits FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert processed deposits"
  ON public.processed_deposits FOR INSERT
  WITH CHECK (true);

-- Funktion zum Generieren eines einzigartigen Memo-Codes
CREATE OR REPLACE FUNCTION public.generate_memo_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generiere 8-stelligen alphanumerischen Code
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    
    -- Prüfe ob Code bereits existiert
    SELECT EXISTS (
      SELECT 1 FROM deposit_memos WHERE memo_code = new_code
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;