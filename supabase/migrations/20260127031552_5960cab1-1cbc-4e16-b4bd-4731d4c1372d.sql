-- Fix 1: Create a public view for profiles that excludes email (PII)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id, 
  display_name, 
  bio, 
  avatar_url, 
  is_public, 
  created_at, 
  updated_at
FROM public.profiles
WHERE is_public = true;

-- Fix 2: Drop the existing overly permissive public profiles policy
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;

-- Fix 3: Create a new restrictive policy - public viewers can only see non-PII via the view
-- The base table should only be accessible to the profile owner
CREATE POLICY "Users can view public profiles without PII"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()  -- Users can always see their own full profile
    OR (is_public = true AND id = auth.uid())  -- Redundant but explicit
  );

-- Fix 4: Update storage bucket to be private
UPDATE storage.buckets SET public = false WHERE id = 'media';

-- Fix 5: Drop the overly permissive storage policy
DROP POLICY IF EXISTS "Public media files are viewable by everyone" ON storage.objects;

-- Fix 6: Create proper storage policies that respect privacy levels
CREATE POLICY "Users can view their own media files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view public media files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media' AND
    EXISTS (
      SELECT 1 FROM public.media_items
      WHERE owner_id::text = (storage.foldername(name))[1]
      AND privacy_level = 'public'
      AND is_deleted = false
      AND file_url LIKE '%' || name
    )
  );

CREATE POLICY "Users can view shared media files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media' AND
    EXISTS (
      SELECT 1 FROM public.media_items mi
      JOIN public.shared_items si ON si.item_id = mi.id AND si.item_type = 'media'
      WHERE mi.owner_id::text = (storage.foldername(name))[1]
      AND mi.privacy_level = 'shared'
      AND mi.is_deleted = false
      AND mi.file_url LIKE '%' || name
      AND (si.shared_with_user_id = auth.uid() OR si.share_token IS NOT NULL)
      AND (si.expires_at IS NULL OR si.expires_at > now())
    )
  );