
-- Create private storage bucket for AKB uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('akb', 'akb', false);

-- Users can upload to their own folder
CREATE POLICY "akb_upload_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'akb' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can read their own files
CREATE POLICY "akb_select_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'akb' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own files
CREATE POLICY "akb_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'akb' AND auth.uid()::text = (storage.foldername(name))[1]);
