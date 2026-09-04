-- Migration to set up storage buckets for user avatars and site images

-- 1. Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up policies for 'avatars' bucket
-- Allow Public View
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Allow Authenticated Upload
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

-- Allow Owner Update/Delete
CREATE POLICY "Owner Access" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Set up policies for 'site-images' bucket
-- Allow Public View
CREATE POLICY "Public Access Site" ON storage.objects FOR SELECT USING (bucket_id = 'site-images');

-- Allow Authenticated Upload
CREATE POLICY "Authenticated Upload Site" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-images');

-- Allow Owner Update/Delete
CREATE POLICY "Owner Access Site" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'site-images' AND auth.uid()::text = (storage.foldername(name))[1]);
