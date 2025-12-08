-- Create table for tracking login attempts
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  username TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- Create table for blocked IPs
CREATE TABLE public.blocked_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  reason TEXT DEFAULT 'Too many failed login attempts'
);

-- Create index for faster lookups
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address);
CREATE INDEX idx_login_attempts_time ON public.login_attempts(attempted_at);
CREATE INDEX idx_blocked_ips_address ON public.blocked_ips(ip_address);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only allow edge functions (service role) to access these tables
CREATE POLICY "Service role only for login_attempts"
ON public.login_attempts
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY "Service role only for blocked_ips"
ON public.blocked_ips
FOR ALL
USING (false)
WITH CHECK (false);