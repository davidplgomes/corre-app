-- Create the storage bucket for marketplace listing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-images', 'marketplace-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to marketplace images
CREATE POLICY "Public read access for marketplace images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'marketplace-images' );

-- Allow authenticated users to upload marketplace images
-- Files must be in a folder named after their user ID
CREATE POLICY "Authenticated users can upload marketplace images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'marketplace-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own marketplace images
CREATE POLICY "Users can update own marketplace images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'marketplace-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'marketplace-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own marketplace images
CREATE POLICY "Users can delete own marketplace images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'marketplace-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
