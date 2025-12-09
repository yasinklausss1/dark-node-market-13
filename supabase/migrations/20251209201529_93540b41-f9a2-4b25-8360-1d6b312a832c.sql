-- Create storage bucket for buyer notes images and digital content images
INSERT INTO storage.buckets (id, name, public) VALUES ('order-attachments', 'order-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to order-attachments
CREATE POLICY "Authenticated users can upload order attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-attachments' AND auth.role() = 'authenticated');

-- Allow anyone to view order attachments (public bucket)
CREATE POLICY "Anyone can view order attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their order attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'order-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);