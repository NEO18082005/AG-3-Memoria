-- Create privacy level enum
CREATE TYPE privacy_level AS ENUM ('private', 'shared', 'public');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create media_items table
CREATE TABLE public.media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- for videos, in seconds
  title TEXT,
  description TEXT,
  privacy_level privacy_level NOT NULL DEFAULT 'private',
  is_favorite BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create albums table
CREATE TABLE public.albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  privacy_level privacy_level NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create album_media junction table
CREATE TABLE public.album_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(album_id, media_item_id)
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, name)
);

-- Create tag_media junction table
CREATE TABLE public.tag_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  UNIQUE(tag_id, media_item_id)
);

-- Create shared_items table for sharing functionality
CREATE TABLE public.shared_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('media', 'album')),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ai_generations table to track AI-generated content
CREATE TABLE public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text-to-image', 'image-to-image', 'text-to-video', 'enhance', 'remove-bg', 'upscale')),
  input_media_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
  output_media_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

-- Helper function to check media access
CREATE OR REPLACE FUNCTION public.can_access_media(media_id UUID)
RETURNS BOOLEAN
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
        AND (shared_with_user_id = auth.uid() OR share_token IS NOT NULL)
      ))
    )
  );
$$;

-- Helper function to check album access
CREATE OR REPLACE FUNCTION public.can_access_album(album_id UUID)
RETURNS BOOLEAN
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
        AND (shared_with_user_id = auth.uid() OR share_token IS NOT NULL)
      ))
    )
  );
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view public profiles"
  ON public.profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Media items RLS policies
CREATE POLICY "Users can view their own media"
  ON public.media_items FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view public media"
  ON public.media_items FOR SELECT
  USING (privacy_level = 'public' AND is_deleted = false);

CREATE POLICY "Users can view shared media"
  ON public.media_items FOR SELECT
  USING (
    privacy_level = 'shared' 
    AND is_deleted = false
    AND EXISTS (
      SELECT 1 FROM public.shared_items
      WHERE item_id = media_items.id
      AND item_type = 'media'
      AND shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own media"
  ON public.media_items FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own media"
  ON public.media_items FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own media"
  ON public.media_items FOR DELETE
  USING (owner_id = auth.uid());

-- Albums RLS policies
CREATE POLICY "Users can view their own albums"
  ON public.albums FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view public albums"
  ON public.albums FOR SELECT
  USING (privacy_level = 'public');

CREATE POLICY "Users can insert their own albums"
  ON public.albums FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own albums"
  ON public.albums FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own albums"
  ON public.albums FOR DELETE
  USING (owner_id = auth.uid());

-- Album media RLS policies
CREATE POLICY "Users can view album media for accessible albums"
  ON public.album_media FOR SELECT
  USING (public.can_access_album(album_id));

CREATE POLICY "Users can insert media to their albums"
  ON public.album_media FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.albums WHERE id = album_id AND owner_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.media_items WHERE id = media_item_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can remove media from their albums"
  ON public.album_media FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.albums WHERE id = album_id AND owner_id = auth.uid()));

-- Tags RLS policies
CREATE POLICY "Users can view their own tags"
  ON public.tags FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own tags"
  ON public.tags FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own tags"
  ON public.tags FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own tags"
  ON public.tags FOR DELETE
  USING (owner_id = auth.uid());

-- Tag media RLS policies
CREATE POLICY "Users can view tag media for their media"
  ON public.tag_media FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.media_items WHERE id = media_item_id AND owner_id = auth.uid()));

CREATE POLICY "Users can tag their own media"
  ON public.tag_media FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tags WHERE id = tag_id AND owner_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.media_items WHERE id = media_item_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can untag their own media"
  ON public.tag_media FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.media_items WHERE id = media_item_id AND owner_id = auth.uid()));

-- Shared items RLS policies
CREATE POLICY "Users can view shares they created or received"
  ON public.shared_items FOR SELECT
  USING (owner_id = auth.uid() OR shared_with_user_id = auth.uid());

CREATE POLICY "Users can create shares for their items"
  ON public.shared_items FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own shares"
  ON public.shared_items FOR DELETE
  USING (owner_id = auth.uid());

-- AI generations RLS policies
CREATE POLICY "Users can view their own generations"
  ON public.ai_generations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own generations"
  ON public.ai_generations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own generations"
  ON public.ai_generations FOR UPDATE
  USING (user_id = auth.uid());

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  524288000, -- 500MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
);

-- Storage RLS policies
CREATE POLICY "Users can upload their own media files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own media files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own media files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public media files are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_items_updated_at
  BEFORE UPDATE ON public.media_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_albums_updated_at
  BEFORE UPDATE ON public.albums
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_media_items_owner ON public.media_items(owner_id);
CREATE INDEX idx_media_items_privacy ON public.media_items(privacy_level);
CREATE INDEX idx_media_items_favorite ON public.media_items(owner_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_media_items_deleted ON public.media_items(owner_id, is_deleted) WHERE is_deleted = true;
CREATE INDEX idx_albums_owner ON public.albums(owner_id);
CREATE INDEX idx_album_media_album ON public.album_media(album_id);
CREATE INDEX idx_album_media_media ON public.album_media(media_item_id);
CREATE INDEX idx_tags_owner ON public.tags(owner_id);
CREATE INDEX idx_shared_items_item ON public.shared_items(item_id, item_type);
CREATE INDEX idx_shared_items_recipient ON public.shared_items(shared_with_user_id);
CREATE INDEX idx_ai_generations_user ON public.ai_generations(user_id);