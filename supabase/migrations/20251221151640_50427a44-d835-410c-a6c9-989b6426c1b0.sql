-- Create page_visits table for IP logging
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  page TEXT NOT NULL DEFAULT '/auth',
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  referrer TEXT,
  session_id TEXT,
  is_suspicious BOOLEAN DEFAULT false,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for fast querying
CREATE INDEX idx_page_visits_ip ON public.page_visits(ip_address);
CREATE INDEX idx_page_visits_visited_at ON public.page_visits(visited_at DESC);
CREATE INDEX idx_page_visits_page ON public.page_visits(page);

-- Enable RLS
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Only admins can view page visits
CREATE POLICY "Admins can view all page visits"
ON public.page_visits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert page visits (no auth required for tracking)
CREATE POLICY "System can insert page visits"
ON public.page_visits
FOR INSERT
WITH CHECK (true);

-- Admins can delete page visits
CREATE POLICY "Admins can delete page visits"
ON public.page_visits
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_visits;