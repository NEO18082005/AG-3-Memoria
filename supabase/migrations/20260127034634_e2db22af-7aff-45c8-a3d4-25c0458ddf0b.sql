-- Fix SECURITY DEFINER functions to properly validate share tokens
-- Instead of checking "share_token IS NOT NULL" (which grants access if ANY token exists),
-- we now require proper validation through the application layer

-- Update can_access_media to remove the insecure share_token check
-- Token validation should happen at the application layer before granting access
CREATE OR REPLACE FUNCTION public.can_access_media(media_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.media_items
    WHERE id = media_id
    AND is_deleted = false
    AND (
      owner_id = auth.uid()
      OR privacy_level = 'public'
      OR (privacy_level = 'shared' AND EXISTS (
        SELECT 1 FROM public.shared_items
        WHERE item_id = media_id
        AND item_type = 'media'
        AND shared_with_user_id = auth.uid()
        AND (expires_at IS NULL OR expires_at > now())
      ))
    )
  );
$$;

-- Update can_access_album similarly
CREATE OR REPLACE FUNCTION public.can_access_album(album_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.albums
    WHERE id = album_id
    AND (
      owner_id = auth.uid()
      OR privacy_level = 'public'
      OR (privacy_level = 'shared' AND EXISTS (
        SELECT 1 FROM public.shared_items
        WHERE item_id = album_id
        AND item_type = 'album'
        AND shared_with_user_id = auth.uid()
        AND (expires_at IS NULL OR expires_at > now())
      ))
    )
  );
$$;

-- Create new functions that accept and validate tokens for share link access
-- These are used by the SharedItemPage when accessing via token
CREATE OR REPLACE FUNCTION public.validate_share_token(
  p_token text,
  p_item_type text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id uuid;
BEGIN
  SELECT item_id INTO v_item_id
  FROM public.shared_items
  WHERE share_token = p_token
    AND item_type = p_item_type
    AND (expires_at IS NULL OR expires_at > now());
  
  RETURN v_item_id;
END;
$$;

-- Update storage policies to include expiration checks
DROP POLICY IF EXISTS "Users can view shared media files" ON storage.objects;

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
      AND (
        si.shared_with_user_id = auth.uid()
        -- Token-based access requires application-level validation
      )
      AND (si.expires_at IS NULL OR si.expires_at > now())
    )
  );