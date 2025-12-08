-- Create seller_reports table
CREATE TABLE public.seller_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_seller_id UUID NOT NULL,
  reason TEXT NOT NULL,
  custom_note TEXT,
  evidence_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  handled_by UUID,
  handled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_messages table for communication
CREATE TABLE public.report_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.seller_reports(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for seller_reports
CREATE POLICY "Users can create reports"
  ON public.seller_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
  ON public.seller_reports
  FOR SELECT
  USING (auth.uid() = reporter_id OR auth.uid() = reported_seller_id OR get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Admins can update reports"
  ON public.seller_reports
  FOR UPDATE
  USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- RLS policies for report_messages
CREATE POLICY "Users can send messages in their reports"
  ON public.report_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND 
    EXISTS (
      SELECT 1 FROM public.seller_reports sr 
      WHERE sr.id = report_id 
      AND (sr.reporter_id = auth.uid() OR sr.reported_seller_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role)
    )
  );

CREATE POLICY "Users can view messages in their reports"
  ON public.report_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_reports sr 
      WHERE sr.id = report_id 
      AND (sr.reporter_id = auth.uid() OR sr.reported_seller_id = auth.uid() OR get_user_role(auth.uid()) = 'admin'::user_role)
    )
  );

-- Create storage bucket for report evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('report-evidence', 'report-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for report evidence
CREATE POLICY "Users can upload report evidence"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'report-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view report evidence"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'report-evidence' AND get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Users can view their own evidence"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'report-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);