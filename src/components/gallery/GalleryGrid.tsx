import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MediaCard } from './MediaCard';
import { ImagePreviewModal } from './ImagePreviewModal';
import { MediaEditModal } from './MediaEditModal';
import { ImageEditor } from '@/components/editor/ImageEditor';
import { VideoEditor } from '@/components/editor/VideoEditor';
import { ShareModal } from '@/components/share/ShareModal';
import { cn } from '@/lib/utils';
import { MediaItem, ViewMode } from '@/hooks/useMediaGallery';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GalleryGridProps {
  items: MediaItem[];
  viewMode: ViewMode;
  selectedItems: string[];
  onToggleSelection: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (ids: string[]) => void;
  onUpdatePrivacy?: (id: string, privacy: 'private' | 'shared' | 'public') => void;
  onRefresh?: () => void;
}

export function GalleryGrid({
  items,
  viewMode,
  selectedItems,
  onToggleSelection,
  onToggleFavorite,
  onDelete,
  onUpdatePrivacy,
  onRefresh,
}: GalleryGridProps) {
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [editItem, setEditItem] = useState<MediaItem | null>(null);
  const [imageEditorItem, setImageEditorItem] = useState<MediaItem | null>(null);
  const [videoEditorItem, setVideoEditorItem] = useState<MediaItem | null>(null);
  const [shareItem, setShareItem] = useState<MediaItem | null>(null);

  const currentIndex = previewItem
    ? items.findIndex((item) => item.id === previewItem.id)
    : -1;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setPreviewItem(items[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setPreviewItem(items[currentIndex + 1]);
    }
  };

  const handleEdit = (item: MediaItem) => {
    setPreviewItem(null);
    const isVideo = item.file_type.startsWith('video/');
    if (isVideo) {
      setVideoEditorItem(item);
    } else {
      setImageEditorItem(item);
    }
  };

  const handleMetadataEdit = (item: MediaItem) => {
    setPreviewItem(null);
    setEditItem(item);
  };

  const handleShare = (item: MediaItem) => {
    setShareItem(item);
  };

  const handleImageSave = async (dataUrl: string) => {
    // For now, just download - full save would require re-upload
    const link = document.createElement('a');
    link.download = `edited-${imageEditorItem?.file_name || 'image'}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleSave = async (id: string, updates: Partial<MediaItem>) => {
    const { error } = await supabase
      .from('media_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Refresh the gallery
    onRefresh?.();
  };

  const gridClassName = cn(
    viewMode === 'masonry' && 'masonry-grid',
    viewMode === 'grid' && 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4',
    viewMode === 'list' && 'space-y-2'
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="w-10 h-10 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-1">No media found</h3>
        <p className="text-muted-foreground max-w-sm">
          Upload some images or videos to get started, or try a different search.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={gridClassName}>
        <AnimatePresence>
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isSelected={selectedItems.includes(item.id)}
              onSelect={() => onToggleSelection(item.id)}
              onToggleFavorite={() => onToggleFavorite(item.id)}
              onView={() => setPreviewItem(item)}
              onEdit={() => handleEdit(item)}
              onDelete={() => onDelete([item.id])}
              onUpdatePrivacy={(privacy) => onUpdatePrivacy?.(item.id, privacy)}
            />
          ))}
        </AnimatePresence>
      </div>

      <ImagePreviewModal
        item={previewItem}
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToggleFavorite={() => previewItem && onToggleFavorite(previewItem.id)}
        onEdit={() => previewItem && handleEdit(previewItem)}
        onDelete={() => {
          if (previewItem) {
            onDelete([previewItem.id]);
            setPreviewItem(null);
          }
        }}
        hasPrevious={currentIndex > 0}
        hasNext={currentIndex < items.length - 1}
      />

      <MediaEditModal
        item={editItem}
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        onSave={handleSave}
      />

      <ImageEditor
        imageUrl={imageEditorItem?.file_url || ''}
        isOpen={!!imageEditorItem}
        onClose={() => setImageEditorItem(null)}
        onSave={handleImageSave}
        fileName={imageEditorItem?.file_name}
      />

      <VideoEditor
        videoUrl={videoEditorItem?.file_url || ''}
        isOpen={!!videoEditorItem}
        onClose={() => setVideoEditorItem(null)}
        fileName={videoEditorItem?.file_name}
      />

      {shareItem && (
        <ShareModal
          itemId={shareItem.id}
          itemType="media"
          itemTitle={shareItem.title || shareItem.file_name}
          itemUrl={shareItem.file_url}
          currentPrivacy={shareItem.privacy_level}
          isOpen={!!shareItem}
          onClose={() => setShareItem(null)}
          onPrivacyChange={(privacy) => onUpdatePrivacy?.(shareItem.id, privacy)}
        />
      )}
    </>
  );
}
