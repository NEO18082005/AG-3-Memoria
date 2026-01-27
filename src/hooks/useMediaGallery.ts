import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MediaItem {
  id: string;
  owner_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  title: string | null;
  description: string | null;
  privacy_level: 'private' | 'shared' | 'public';
  is_favorite: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  privacy_level: 'private' | 'shared' | 'public';
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export type ViewMode = 'grid' | 'masonry' | 'list';
export type SortBy = 'date' | 'name' | 'size';
export type SortOrder = 'asc' | 'desc';

export function useMediaGallery() {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('masonry');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showTrashedOnly, setShowTrashedOnly] = useState(false);

  // Fetch media items
  const fetchMedia = async () => {
    if (!user) {
      setMedia([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('media_items')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (showTrashedOnly) {
        query = query.eq('is_deleted', true);
      } else {
        query = query.eq('is_deleted', false);
      }

      if (showFavoritesOnly) {
        query = query.eq('is_favorite', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching media:', error);
        toast.error('Failed to load media');
        return;
      }

      setMedia(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch albums
  const fetchAlbums = async () => {
    if (!user) {
      setAlbums([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching albums:', error);
        return;
      }

      // Get item counts for each album
      const albumsWithCounts = await Promise.all(
        (data || []).map(async (album) => {
          const { count } = await supabase
            .from('album_media')
            .select('*', { count: 'exact', head: true })
            .eq('album_id', album.id);
          return { ...album, item_count: count || 0 };
        })
      );

      setAlbums(albumsWithCounts);
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
  };

  useEffect(() => {
    fetchMedia();
    fetchAlbums();
  }, [user, showFavoritesOnly, showTrashedOnly, sortOrder]);

  // Filter media based on search
  const filteredMedia = media.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.file_name.toLowerCase().includes(query)
    );
  });

  // Sort media
  const sortedMedia = [...filteredMedia].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'name':
        comparison = (a.title || a.file_name).localeCompare(b.title || b.file_name);
        break;
      case 'size':
        comparison = (a.file_size || 0) - (b.file_size || 0);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Toggle favorite
  const toggleFavorite = async (id: string) => {
    const item = media.find((m) => m.id === id);
    if (!item) return;

    const { error } = await supabase
      .from('media_items')
      .update({ is_favorite: !item.is_favorite })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update favorite');
      return;
    }

    setMedia((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_favorite: !m.is_favorite } : m))
    );
  };

  // Move to trash
  const moveToTrash = async (ids: string[]) => {
    const { error } = await supabase
      .from('media_items')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .in('id', ids);

    if (error) {
      toast.error('Failed to move to trash');
      return;
    }

    toast.success(`${ids.length} item(s) moved to trash`);
    setMedia((prev) => prev.filter((m) => !ids.includes(m.id)));
    setSelectedItems([]);
  };

  // Restore from trash
  const restoreFromTrash = async (ids: string[]) => {
    const { error } = await supabase
      .from('media_items')
      .update({ is_deleted: false, deleted_at: null })
      .in('id', ids);

    if (error) {
      toast.error('Failed to restore items');
      return;
    }

    toast.success(`${ids.length} item(s) restored`);
    fetchMedia();
    setSelectedItems([]);
  };

  // Permanently delete
  const permanentlyDelete = async (ids: string[]) => {
    const { error } = await supabase
      .from('media_items')
      .delete()
      .in('id', ids);

    if (error) {
      toast.error('Failed to delete items');
      return;
    }

    toast.success(`${ids.length} item(s) permanently deleted`);
    setMedia((prev) => prev.filter((m) => !ids.includes(m.id)));
    setSelectedItems([]);
  };

  // Update privacy
  const updatePrivacy = async (id: string, privacy: 'private' | 'shared' | 'public') => {
    const { error } = await supabase
      .from('media_items')
      .update({ privacy_level: privacy })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update privacy');
      return;
    }

    setMedia((prev) =>
      prev.map((m) => (m.id === id ? { ...m, privacy_level: privacy } : m))
    );
    toast.success('Privacy updated');
  };

  // Update media item
  const updateMediaItem = async (id: string, updates: Partial<MediaItem>) => {
    const { error } = await supabase
      .from('media_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update media');
      return false;
    }

    setMedia((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
    return true;
  };

  // Create album
  const createAlbum = async (name: string, description?: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('albums')
      .insert({
        owner_id: user.id,
        name,
        description,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create album');
      return null;
    }

    toast.success('Album created');
    fetchAlbums();
    return data;
  };

  // Add to album
  const addToAlbum = async (albumId: string, mediaIds: string[]) => {
    const inserts = mediaIds.map((mediaId) => ({
      album_id: albumId,
      media_item_id: mediaId,
    }));

    const { error } = await supabase
      .from('album_media')
      .upsert(inserts, { onConflict: 'album_id,media_item_id' });

    if (error) {
      toast.error('Failed to add to album');
      return;
    }

    toast.success(`Added ${mediaIds.length} item(s) to album`);
    fetchAlbums();
  };

  // Upload file - uses signed URLs for private bucket access
  const uploadFile = async (file: File): Promise<MediaItem | null> => {
    if (!user) return null;

    // Sanitize and validate file extension - Images only
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    
    if (!allowedExtensions.includes(fileExt)) {
      toast.error('Invalid file extension. Only images are allowed.');
      return null;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Only images are allowed');
      return null;
    }

    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to storage (private bucket)
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Failed to upload file');
      return null;
    }

    // Generate a signed URL for private bucket access (1 year expiry for storage)
    // Note: We store a reference URL pattern, actual access happens via signed URLs
    const { data: signedData, error: signedError } = await supabase.storage
      .from('media')
      .createSignedUrl(fileName, 31536000); // 1 year expiry

    if (signedError || !signedData) {
      console.error('Signed URL error:', signedError);
      // Fallback to constructing a reference URL (will need signed URL at access time)
    }

    // Store the file path reference - access will be via signed URLs
    // We store a canonical URL format that can be used to derive the file path
    const fileUrl = signedData?.signedUrl || 
      `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/media/${fileName}`;

    // Create media item record
    const { data, error } = await supabase
      .from('media_items')
      .insert({
        owner_id: user.id,
        file_url: fileUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        title: file.name.split('.')[0],
      })
      .select()
      .single();

    if (error) {
      console.error('DB error:', error);
      toast.error('Failed to save media');
      return null;
    }

    return data;
  };

  // Selection helpers
  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedItems(sortedMedia.map((item) => item.id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  return {
    media: sortedMedia,
    albums,
    loading,
    selectedItems,
    viewMode,
    sortBy,
    sortOrder,
    searchQuery,
    activeAlbum,
    showFavoritesOnly,
    showTrashedOnly,
    setViewMode,
    setSortBy,
    setSortOrder,
    setSearchQuery,
    setActiveAlbum,
    setShowFavoritesOnly,
    setShowTrashedOnly,
    toggleFavorite,
    toggleSelection,
    selectAll,
    clearSelection,
    moveToTrash,
    restoreFromTrash,
    permanentlyDelete,
    updatePrivacy,
    updateMediaItem,
    createAlbum,
    addToAlbum,
    uploadFile,
    refresh: () => {
      fetchMedia();
      fetchAlbums();
    },
  };
}
