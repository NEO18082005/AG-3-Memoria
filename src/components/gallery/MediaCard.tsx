import React, { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, MoreHorizontal, Check, Eye, Lock, Link2, Play, Globe, Share2, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { MediaItem } from '@/hooks/useMediaGallery';

interface MediaCardProps {
  item: MediaItem;
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onView: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onUpdatePrivacy?: (privacy: 'private' | 'shared' | 'public') => void;
}

export const MediaCard = forwardRef<HTMLDivElement, MediaCardProps>(function MediaCard({
  item,
  isSelected,
  onSelect,
  onToggleFavorite,
  onView,
  onEdit,
  onDelete,
  onUpdatePrivacy,
}, ref) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const visibilityIcon = {
    private: Lock,
    shared: Link2,
    public: Globe,
  }[item.privacy_level];

  const VisibilityIcon = visibilityIcon;

  const isVideo = item.file_type.startsWith('video/');

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className="masonry-item"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          'relative rounded-xl overflow-hidden bg-muted cursor-pointer group transition-all duration-300',
          isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        )}
        onClick={onView}
      >
        {/* Image/Video */}
        <div className="relative">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse aspect-square" />
          )}
          
          {isVideo ? (
            <video
              src={item.file_url}
              className={cn(
                'w-full h-auto object-cover transition-all duration-500',
                imageLoaded ? 'opacity-100' : 'opacity-0',
                isHovered && 'scale-105'
              )}
              onLoadedData={() => setImageLoaded(true)}
              muted
            />
          ) : (
            <img
              src={item.file_url}
              alt={item.title || item.file_name}
              className={cn(
                'w-full h-auto object-cover transition-all duration-500',
                imageLoaded ? 'opacity-100' : 'opacity-0',
                isHovered && 'scale-105'
              )}
              onLoad={() => setImageLoaded(true)}
            />
          )}

          {/* Video Play Indicator */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-foreground/50 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-6 h-6 text-background fill-background ml-1" />
              </div>
            </div>
          )}

          {/* Overlay */}
          <motion.div
            initial={false}
            animate={{ opacity: isHovered ? 1 : 0 }}
            className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-foreground/30"
          />

          {/* Top Actions */}
          <motion.div
            initial={false}
            animate={{ opacity: isHovered || isSelected ? 1 : 0 }}
            className="absolute top-2 left-2 right-2 flex items-center justify-between"
          >
            {/* Selection Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className={cn(
                'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all',
                isSelected
                  ? 'bg-primary border-primary'
                  : 'border-background/80 bg-foreground/20 hover:bg-foreground/40'
              )}
            >
              {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
            </button>

            {/* Visibility & Favorite */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className="p-1.5 rounded-lg bg-foreground/20 backdrop-blur-sm hover:bg-foreground/40 transition-colors"
              >
                <Heart
                  className={cn(
                    'w-4 h-4 transition-colors',
                    item.is_favorite
                      ? 'text-red-500 fill-red-500'
                      : 'text-background'
                  )}
                />
              </button>
              <div className="p-1.5 rounded-lg bg-foreground/20 backdrop-blur-sm">
                <VisibilityIcon className="w-4 h-4 text-background" />
              </div>
            </div>
          </motion.div>

          {/* Bottom Info */}
          <motion.div
            initial={false}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
            className="absolute bottom-2 left-2 right-2"
          >
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-background truncate">
                  {item.title || item.file_name}
                </h3>
              </div>

              {/* More Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="bg-foreground/20 backdrop-blur-sm hover:bg-foreground/40 text-background"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Share2 className="w-4 h-4 mr-2" />
                      Privacy
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => onUpdatePrivacy?.('private')}>
                        <Lock className="w-4 h-4 mr-2" />
                        Private
                        {item.privacy_level === 'private' && <Check className="w-4 h-4 ml-auto" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdatePrivacy?.('shared')}>
                        <Link2 className="w-4 h-4 mr-2" />
                        Link sharing
                        {item.privacy_level === 'shared' && <Check className="w-4 h-4 ml-auto" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdatePrivacy?.('public')}>
                        <Globe className="w-4 h-4 mr-2" />
                        Public
                        {item.privacy_level === 'public' && <Check className="w-4 h-4 ml-auto" />}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Move to Trash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
});
