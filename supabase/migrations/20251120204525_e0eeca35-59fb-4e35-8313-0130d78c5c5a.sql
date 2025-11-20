-- Create referral_codes table
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  uses_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral_rewards table
CREATE TABLE public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  credits_awarded INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_id)
);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_codes
CREATE POLICY "Users can view their own referral code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referral code"
  ON public.referral_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can view all referral codes"
  ON public.referral_codes FOR SELECT
  USING (true);

-- RLS Policies for referral_rewards
CREATE POLICY "Users can view their own referral rewards"
  ON public.referral_rewards FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can manage referral rewards"
  ON public.referral_rewards FOR ALL
  USING (true);

-- Create updated_at trigger for referral_codes
CREATE TRIGGER update_referral_codes_updated_at
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();