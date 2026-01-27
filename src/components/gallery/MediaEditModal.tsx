import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Sparkles,
  Tag,
  Type,
  Image,
  Video,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MediaItem } from '@/hooks/useMediaGallery';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaEditModalProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<MediaItem>) => Promise<void>;
  onTagsUpdate?: (mediaId: string, tags: string[]) => Promise<void>;
}

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

export function MediaEditModal({
  item,
  isOpen,
  onClose,
  onSave,
  onTagsUpdate,
}: MediaEditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<TagItem[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);

  // Load item data when modal opens
  useEffect(() => {
    if (item && isOpen) {
      setTitle(item.title || item.file_name.split('.')[0]);
      setDescription(item.description || '');
      loadItemTags();
      loadAvailableTags();
    }
  }, [item, isOpen]);

  const loadItemTags = async () => {
    if (!item) return;
    
    const { data, error } = await supabase
      .from('tag_media')
      .select('tag_id, tags(id, name, color)')
      .eq('media_item_id', item.id);

    if (!error && data) {
      const tagList = data
        .map((tm: any) => tm.tags)
        .filter(Boolean) as TagItem[];
      setTags(tagList);
    }
  };

  const loadAvailableTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (!error && data) {
      setAvailableTags(data);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !item) return;

    const tagName = newTag.trim().toLowerCase();
    
    // Check if tag already exists
    let existingTag = availableTags.find(t => t.name.toLowerCase() === tagName);
    
    if (!existingTag) {
      // Create new tag
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const { data, error } = await supabase
        .from('tags')
        .insert({ name: tagName, owner_id: session.session.user.id })
        .select()
        .single();

      if (error) {
        toast.error('Failed to create tag');
        return;
      }
      existingTag = data;
      setAvailableTags(prev => [...prev, data]);
    }

    // Check if already tagged
    if (tags.some(t => t.id === existingTag!.id)) {
      setNewTag('');
      return;
    }

    // Add tag to media
    const { error } = await supabase
      .from('tag_media')
      .insert({ tag_id: existingTag.id, media_item_id: item.id });

    if (error) {
      toast.error('Failed to add tag');
      return;
    }

    setTags(prev => [...prev, existingTag!]);
    setNewTag('');
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!item) return;

    const { error } = await supabase
      .from('tag_media')
      .delete()
      .eq('tag_id', tagId)
      .eq('media_item_id', item.id);

    if (error) {
      toast.error('Failed to remove tag');
      return;
    }

    setTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleAIAutoTag = async () => {
    if (!item) return;

    setAiGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-image', {
        body: {
          type: 'auto-tag',
          imageUrl: item.file_url,
        },
      });

      if (response.error) throw response.error;

      const suggestedTags = response.data?.tags || [];
      
      // Add each suggested tag
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      for (const tagName of suggestedTags) {
        const name = tagName.toLowerCase().trim();
        
        // Check if tag exists
        let existingTag = availableTags.find(t => t.name.toLowerCase() === name);
        
        if (!existingTag) {
          const { data } = await supabase
            .from('tags')
            .insert({ name, owner_id: session.session.user.id })
            .select()
            .single();
          
          if (data) {
            existingTag = data;
            setAvailableTags(prev => [...prev, data]);
          }
        }

        if (existingTag && !tags.some(t => t.id === existingTag!.id)) {
          await supabase
            .from('tag_media')
            .insert({ tag_id: existingTag.id, media_item_id: item.id });
          
          setTags(prev => [...prev, existingTag!]);
        }
      }

      toast.success(`Added ${suggestedTags.length} AI-generated tags`);
    } catch (error) {
      console.error('AI tagging error:', error);
      toast.error('Failed to generate tags');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!item) return;

    setSaving(true);
    try {
      await onSave(item.id, { title, description });
      toast.success('Changes saved');
      onClose();
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent scroll when open
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
          className="fixed inset-0 z-50 bg-foreground/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {isVideo ? (
                    <Video className="w-5 h-5 text-primary" />
                  ) : (
                    <Image className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold">Edit Media</h2>
                  <p className="text-sm text-muted-foreground">
                    Update title, description, and tags
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Preview */}
              <div className="rounded-xl overflow-hidden bg-muted aspect-video flex items-center justify-center">
                {isVideo ? (
                  <video
                    src={item.file_url}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={item.file_url}
                    alt={item.title || item.file_name}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title..."
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                />
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAIAutoTag}
                    disabled={aiGenerating}
                    className="gap-2"
                  >
                    {aiGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    AI Auto-Tag
                  </Button>
                </div>

                {/* Current Tags */}
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="gap-1 pl-2 pr-1 py-1 cursor-pointer hover:bg-destructive/10"
                      onClick={() => handleRemoveTag(tag.id)}
                    >
                      {tag.name}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      No tags yet
                    </span>
                  )}
                </div>

                {/* Add Tag */}
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button variant="outline" onClick={handleAddTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Suggested Tags */}
                {availableTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {availableTags
                      .filter((t) => !tags.some((tag) => tag.id === t.id))
                      .slice(0, 8)
                      .map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent"
                          onClick={async () => {
                            if (!item) return;
                            await supabase
                              .from('tag_media')
                              .insert({ tag_id: tag.id, media_item_id: item.id });
                            setTags((prev) => [...prev, tag]);
                          }}
                        >
                          + {tag.name}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File name</span>
                  <span>{item.file_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{item.file_type}</span>
                </div>
                {item.file_size && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span>{(item.file_size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uploaded</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                onClick={handleSave}
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
