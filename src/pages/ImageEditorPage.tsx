import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { motion } from 'framer-motion';
import { 
  ImageIcon, 
  Wand2, 
  Eraser, 
  Maximize2, 
  Palette, 
  Brain,
  Crop,
  RotateCcw,
  Sun,
  Contrast,
  Loader2,
  Upload,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ImageEditor } from '@/components/editor/ImageEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMediaGallery, MediaItem } from '@/hooks/useMediaGallery';

const aiEditingTools = [
  {
    id: 'image-to-image',
    icon: Wand2,
    title: 'Image to Image',
    description: 'Transform images with AI-powered edits',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    id: 'remove-bg',
    icon: Eraser,
    title: 'Background Removal',
    description: 'Remove backgrounds with one click',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'upscale',
    icon: Maximize2,
    title: 'AI Upscaling',
    description: 'Enhance resolution without losing quality',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'style-transfer',
    icon: Palette,
    title: 'Style Transfer',
    description: 'Apply artistic styles to your images',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'enhance',
    icon: Brain,
    title: 'Smart Enhance',
    description: 'Auto-improve colors, lighting, and sharpness',
    color: 'from-purple-500 to-pink-500',
  },
];

const basicTools = [
  { icon: Crop, label: 'Crop & Resize' },
  { icon: RotateCcw, label: 'Rotate & Flip' },
  { icon: Sun, label: 'Brightness' },
  { icon: Contrast, label: 'Contrast' },
  { icon: Palette, label: 'Filters' },
];

export default function ImageEditorPage() {
  const { user } = useAuth();
  const { media, refresh } = useMediaGallery();
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleSelectImage = (item: MediaItem) => {
    setSelectedImage(item);
  };

  const handleOpenEditor = () => {
    if (selectedImage) {
      setEditorOpen(true);
    }
  };

  const handleSaveEditedImage = async (dataUrl: string) => {
    if (!user || !selectedImage) return;
    
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], `edited-${Date.now()}.png`, { type: 'image/png' });

    // Upload to storage
    const fileName = `${user.id}/${Date.now()}-edited.png`;
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Failed to save edited image');
      return;
    }

    // Get signed URL
    const { data: signedData } = await supabase.storage
      .from('media')
      .createSignedUrl(fileName, 31536000);

    // Create media item
    const { error: dbError } = await supabase
      .from('media_items')
      .insert({
        owner_id: user.id,
        file_url: signedData?.signedUrl || '',
        file_name: `edited-${selectedImage.file_name}`,
        file_type: 'image/png',
        file_size: blob.size,
        title: `Edited - ${selectedImage.title || selectedImage.file_name}`,
      });

    if (dbError) {
      toast.error('Failed to save to gallery');
      return;
    }

    toast.success('Edited image saved to gallery');
    refresh();
  };

  const handleAITool = async (toolId: string) => {
    if (!selectedImage) {
      toast.error('Please select an image first');
      return;
    }

    setProcessing(true);
    setSelectedTool(toolId);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          type: toolId,
          imageUrl: selectedImage.file_url,
          prompt: toolId === 'style-transfer' ? 'artistic painting style' : undefined,
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        // Save the result
        await handleSaveEditedImage(data.imageUrl);
        toast.success('AI processing complete!');
      }
    } catch (error: any) {
      console.error('AI processing error:', error);
      toast.error(error.message || 'Failed to process image');
    } finally {
      setProcessing(false);
      setSelectedTool(null);
    }
  };

  // Filter to only show images
  const images = media.filter(item => item.file_type.startsWith('image/'));

  return (
    <MainLayout>
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Image Editor</h1>
              <p className="text-muted-foreground">
                Edit and enhance your images with powerful tools
              </p>
            </div>
          </div>
          
          {selectedImage && (
            <Button variant="gradient" onClick={handleOpenEditor} className="gap-2">
              <Wand2 className="w-4 h-4" />
              Open Editor
            </Button>
          )}
        </motion.div>
      </div>

      {!user ? (
        <div className="px-6 pb-12">
          <div className="max-w-md mx-auto text-center py-12">
            <p className="text-muted-foreground mb-4">Sign in to use the image editor</p>
            <Link to="/auth">
              <Button variant="gradient">Sign In</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="px-6 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Image Selection */}
            <div className="lg:col-span-1">
              <div className="p-4 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold mb-4">Select Image</h3>
                
                {images.length === 0 ? (
                  <div className="text-center py-8">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">No images yet</p>
                    <Link to="/upload">
                      <Button variant="outline" size="sm">Upload Images</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                    {images.slice(0, 20).map((item) => (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleSelectImage(item)}
                        className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                          selectedImage?.id === item.id
                            ? 'border-primary'
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                      >
                        <img
                          src={item.file_url}
                          alt={item.title || item.file_name}
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Selected Image Preview */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold mb-4">Preview</h3>
                {selectedImage ? (
                  <div className="aspect-video rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                    <img
                      src={selectedImage.file_url}
                      alt={selectedImage.title || selectedImage.file_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-video rounded-xl bg-muted flex flex-col items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Select an image to edit</p>
                  </div>
                )}
              </div>

              {/* Basic Tools */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <h3 className="font-semibold mb-4">Basic Tools</h3>
                <div className="flex flex-wrap gap-2">
                  {basicTools.map((tool) => (
                    <Button
                      key={tool.label}
                      variant="outline"
                      className="gap-2"
                      onClick={handleOpenEditor}
                      disabled={!selectedImage}
                    >
                      <tool.icon className="w-4 h-4" />
                      {tool.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* AI Editing Tools */}
              <div className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">AI-Powered Tools</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {aiEditingTools.map((tool) => (
                    <motion.button
                      key={tool.id}
                      whileHover={{ y: -2 }}
                      onClick={() => handleAITool(tool.id)}
                      disabled={!selectedImage || processing}
                      className={`group relative rounded-xl bg-muted/50 border p-4 cursor-pointer transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedTool === tool.id
                          ? 'border-primary shadow-vibrant'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                      >
                        {processing && selectedTool === tool.id ? (
                          <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                        ) : (
                          <tool.icon className="w-5 h-5 text-primary-foreground" />
                        )}
                      </div>
                      <h4 className="font-medium text-sm mb-1">{tool.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {tool.description}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Editor Modal */}
      {selectedImage && (
        <ImageEditor
          imageUrl={selectedImage.file_url}
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSave={handleSaveEditedImage}
          fileName={selectedImage.title || selectedImage.file_name}
        />
      )}
    </MainLayout>
  );
}
