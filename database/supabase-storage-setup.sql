-- Storage Bucket Setup for Contestant Photos
-- Run this in Supabase SQL Editor after creating the bucket manually

-- First, create the bucket via UI:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: photos
-- 4. Public: YES
-- 5. Click Create

-- Then run these policies:

-- Policy 1: Allow anyone to upload photos
CREATE POLICY "Allow public uploads to photos bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'photos');

-- Policy 2: Allow anyone to read/view photos
CREATE POLICY "Allow public reads from photos bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Policy 3: Allow updates to existing photos (optional)
CREATE POLICY "Allow public updates to photos bucket"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'photos')
WITH CHECK (bucket_id = 'photos');

-- Policy 4: Allow deletion of photos (optional, for admins)
CREATE POLICY "Allow public deletes from photos bucket"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'photos');

-- Verify bucket exists
SELECT * FROM storage.buckets WHERE name = 'photos';

-- Check policies
SELECT * FROM storage.policies WHERE bucket_id = 'photos';
