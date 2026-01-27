import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle, Loader2, Image, Video, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface SharedMedia {
  id: string;
  title: string | null;
  description: string | null;
  file_url: string;
  file_type: string;
  file_name: string;
  created_at: string;
}

interface SharedAlbum {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
}

export default function SharedItemPage() {
  const { type, token } = useParams<{ type: string; token: string }>();
  const [item, setItem] = useState<SharedMedia | SharedAlbum | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSharedItem() {
      if (!token || !type) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        // Validate the share token
        const { data: share, error: shareError } = await supabase
          .from('shared_items')
          .select('item_id, expires_at, owner_id')
          .eq('share_token', token)
          .eq('item_type', type)
          .single();

        if (shareError || !share) {
          setError('Invalid or expired share link');
          setLoading(false);
          return;
        }

        // Check expiration
        if (share.expires_at && new Date(share.expires_at) < new Date()) {
          setError('This share link has expired');
          setLoading(false);
          return;
        }

        // Load the actual item based on type
        if (type === 'media') {
          const { data: mediaData, error: mediaError } = await supabase
            .from('media_items')
            .select('id, title, description, file_url, file_type, file_name, created_at, owner_id')
            .eq('id', share.item_id)
            .eq('is_deleted', false)
            .single();

          if (mediaError || !mediaData) {
            setError('Item not found');
            setLoading(false);
            return;
          }

          setItem(mediaData as SharedMedia);

          // Get a signed URL for the media file
          // Extract the file path from the URL
          const urlParts = mediaData.file_url.split('/storage/v1/object/public/media/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            const { data: signedData, error: signedError } = await supabase.storage
              .from('media')
              .createSignedUrl(filePath, 3600); // 1 hour expiry

            if (signedData && !signedError) {
              setSignedUrl(signedData.signedUrl);
            }
          }
        } else if (type === 'album') {
          const { data: albumData, error: albumError } = await supabase
            .from('albums')
            .select('id, name, description, cover_image_url, created_at')
            .eq('id', share.item_id)
            .single();

          if (albumError || !albumData) {
            setError('Album not found');
            setLoading(false);
            return;
          }

          setItem(albumData as SharedAlbum);
        } else {
          setError('Invalid item type');
        }
      } catch (err) {
        console.error('Error loading shared item:', err);
        setError('Failed to load shared item');
      } finally {
        setLoading(false);
      }
    }

    loadSharedItem();
  }, [type, token]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading shared content...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Share Link Error</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/">
              <Button variant="gradient" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Go to Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  const isMedia = type === 'media';
  const mediaItem = item as SharedMedia | null;
  const albumItem = item as SharedAlbum | null;

  return (
    <MainLayout>
      <div className="min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {isMedia ? (mediaItem?.title || mediaItem?.file_name) : albumItem?.name}
              </h1>
              <p className="text-muted-foreground">
                Shared {isMedia ? 'media' : 'album'}
              </p>
            </div>
          </div>

          {/* Content */}
          {isMedia && mediaItem && (
            <div className="space-y-6">
              <div className="rounded-2xl overflow-hidden bg-muted aspect-video flex items-center justify-center">
                {mediaItem.file_type.startsWith('image/') ? (
                  <img
                    src={signedUrl || mediaItem.file_url}
                    alt={mediaItem.title || mediaItem.file_name}
                    className="w-full h-full object-contain"
                  />
                ) : mediaItem.file_type.startsWith('video/') ? (
                  <video
                    src={signedUrl || mediaItem.file_url}
                    controls
                    className="w-full h-full"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Image className="w-16 h-16 mx-auto mb-4" />
                    <p>Preview not available</p>
                  </div>
                )}
              </div>

              {mediaItem.description && (
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">{mediaItem.description}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {mediaItem.file_type.startsWith('image/') ? (
                  <Image className="w-4 h-4" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
                <span>{mediaItem.file_type}</span>
                <span>•</span>
                <span>Shared on {new Date(mediaItem.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {!isMedia && albumItem && (
            <div className="space-y-6">
              <div className="rounded-2xl overflow-hidden bg-muted aspect-video flex items-center justify-center">
                {albumItem.cover_image_url ? (
                  <img
                    src={albumItem.cover_image_url}
                    alt={albumItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <FolderOpen className="w-16 h-16 mx-auto mb-4" />
                    <p>Album: {albumItem.name}</p>
                  </div>
                )}
              </div>

              {albumItem.description && (
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">{albumItem.description}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <FolderOpen className="w-4 h-4" />
                <span>Album</span>
                <span>•</span>
                <span>Shared on {new Date(albumItem.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}
