-- Check and Fix Storage Policies for 'avatars' bucket

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated User Upload Avatar" ON storage.objects;
DROP POLICY IF EXISTS "User Update Own Avatar" ON storage.objects;
DROP POLICY IF EXISTS "User Delete Own Avatar" ON storage.objects;
-- Cleanup strictly named policies if any
DROP POLICY IF EXISTS "Avatar Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Auth Update" ON storage.objects;

-- 3. Create Comprehensive Policies

-- A. PUBLIC READ: Allow anyone to see avatars (needed for UI)
CREATE POLICY "Avatar Public Read" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

-- B. AUTH INSERT: Allow Users to upload to their own folder OR Admin/God to upload anywhere
CREATE POLICY "Avatar Auth Insert" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'avatars' 
  AND (
      (storage.foldername(name))[1] = auth.uid()::text  -- Own Folder
      OR 
      (public.get_my_role() IN ('god', 'admin'))       -- Admin Override
  )
);

-- C. AUTH UPDATE: Allow Users to update their own OR Admin/God
CREATE POLICY "Avatar Auth Update" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'avatars' 
  AND (
      (storage.foldername(name))[1] = auth.uid()::text 
      OR 
      (public.get_my_role() IN ('god', 'admin'))
  )
);

-- D. AUTH DELETE: Allow Users to delete their own OR Admin/God
CREATE POLICY "Avatar Auth Delete" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'avatars' 
  AND (
      (storage.foldername(name))[1] = auth.uid()::text 
      OR 
      (public.get_my_role() IN ('god', 'admin'))
  )
);
