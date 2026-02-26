-- Drop previous policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Re-create policies with correct path logic for root files
-- The app uploads files as "{userId}.jpg" in the 'avatars' bucket

-- 1. Public Read Access
CREATE POLICY "Avatar Public Read"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 2. Upload Access: Authenticated users can upload if filename matches their ID
CREATE POLICY "Avatar Upload Own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND name = (auth.uid()::text || '.jpg')
);

-- 3. Update Access: Authenticated users can update their own file
CREATE POLICY "Avatar Update Own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND name = (auth.uid()::text || '.jpg')
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND name = (auth.uid()::text || '.jpg')
);

-- 4. Delete Access: Authenticated users can delete their own file
CREATE POLICY "Avatar Delete Own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND name = (auth.uid()::text || '.jpg')
);
