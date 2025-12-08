-- Make report-evidence bucket public for admin viewing
UPDATE storage.buckets SET public = true WHERE id = 'report-evidence';

-- Add policy for public viewing of report evidence
CREATE POLICY "Report evidence is viewable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'report-evidence');