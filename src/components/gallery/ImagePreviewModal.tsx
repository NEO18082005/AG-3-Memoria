import React, { useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Download,
  Share2,
  Edit,
  Trash2,
  Info,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MediaItem } from '@/hooks/useMediaGallery';

interface ImagePreviewModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const ImagePreviewModal = forwardRef<HTMLDivElement, ImagePreviewModalProps>(function ImagePreviewModal({
  item,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  onToggleFavorite,
  onEdit,
  onDelete,
  hasPrevious,
  hasNext,
}, ref) {
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrevious) onPrevious();
          break;
        case 'ArrowRight':
          if (hasNext) onNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrevious, hasNext, onClose, onPrevious, onNext]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!item) return null;

  const isVideo = item.file_type.startsWith('video/');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Top Bar */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-background hover:bg-background/10"
              >
                <X className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-background font-medium">{item.title || item.file_name}</h2>
                <p className="text-background/60 text-sm">
                  {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleFavorite}
                className="text-background hover:bg-background/10"
              >
                <Heart
                  className={cn(
                    'w-5 h-5',
                    item.is_favorite && 'fill-red-500 text-red-500'
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-background hover:bg-background/10"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = item.file_url;
                  link.download = item.file_name;
                  link.click();
                }}
              >
                <Download className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-background hover:bg-background/10"
              >
                <Share2 className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="text-background hover:bg-background/10"
              >
                <Edit className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-background hover:bg-background/10"
              >
                <Info className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="text-background hover:bg-background/10 hover:text-red-400"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>

          {/* Main Media */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="max-w-[90vw] max-h-[80vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideo ? (
              <video
                src={item.file_url}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            ) : (
              <img
                src={item.file_url}
                alt={item.title || item.file_name}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </motion.div>

          {/* Navigation Arrows */}
          {hasPrevious && (
            <motion.button
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/10 backdrop-blur-sm flex items-center justify-center text-background hover:bg-background/20 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
          )}

          {hasNext && (
            <motion.button
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/10 backdrop-blur-sm flex items-center justify-center text-background hover:bg-background/20 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          )}

          {/* Zoom Controls */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-6 right-6 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-background hover:bg-background/10"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-background hover:bg-background/10"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
