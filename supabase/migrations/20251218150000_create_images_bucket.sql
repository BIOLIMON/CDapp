-- Create 'images' bucket for experiment entries
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for 'images' bucket

-- 1. Public Read Access
DROP POLICY IF EXISTS "Public Access to Images" ON storage.objects;
CREATE POLICY "Public Access to Images" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );

-- 2. Authenticated Upload (User folder isolation recommended but we stick to flat or user-prefixed for now)
-- Pattern in api.ts seems to be `user_id/timestamp.ext` or similar? 
-- Let's allow authenticated users to insert validation
DROP POLICY IF EXISTS "Authenticated User Upload Image" ON storage.objects;
CREATE POLICY "Authenticated User Upload Image" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'images' );

-- 3. Update/Delete Own Images
DROP POLICY IF EXISTS "User Update Own Image" ON storage.objects;
CREATE POLICY "User Update Own Image" ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'images' AND owner = auth.uid() ) WITH CHECK ( bucket_id = 'images' AND owner = auth.uid() );

DROP POLICY IF EXISTS "User Delete Own Image" ON storage.objects;
CREATE POLICY "User Delete Own Image" ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'images' AND owner = auth.uid() );

-- 4. Admin Full Access
DROP POLICY IF EXISTS "Admin Full Access Images" ON storage.objects;
CREATE POLICY "Admin Full Access Images" ON storage.objects FOR ALL USING ( bucket_id = 'images' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('god', 'admin') );
