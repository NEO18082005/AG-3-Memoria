import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, Loader2, Download, Save, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AIStudioPage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: prompt.trim(),
          type: 'text-to-image',
        },
      });

      if (error) {
        throw error;
      }

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast.success('Image generated successfully!');
      } else {
        throw new Error('No image returned');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!generatedImage || !user) return;

    try {
      // Convert base64 or URL to blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: 'image/png' });

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}-ai-generated.png`;
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
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
          file_name: `ai-generated-${Date.now()}.png`,
          file_type: 'image/png',
          file_size: blob.size,
          title: `AI Generated: ${prompt.substring(0, 50)}`,
          description: prompt,
        });

      if (dbError) {
        throw dbError;
      }

      toast.success('Image saved to gallery!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save image');
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ai-generated-${Date.now()}.png`;
    link.click();
    toast.success('Image downloaded');
  };

  const examplePrompts = [
    "A majestic lion in a cyberpunk city at night",
    "Serene mountain landscape at sunset with reflections",
    "Abstract digital art with vibrant colors and geometric shapes",
    "A cozy coffee shop interior in watercolor style",
    "Futuristic space station orbiting a colorful nebula",
  ];

  return (
    <MainLayout>
      <div className="min-h-screen">
        {/* Hero */}
        <div className="relative py-16 px-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative max-w-4xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI Image Generation</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Create with{' '}
              <span className="text-gradient">AI Magic</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Generate stunning images from text descriptions using cutting-edge AI technology.
              Just describe what you imagine!
            </p>
          </motion.div>
        </div>

        {!user ? (
          <div className="px-6 pb-12">
            <div className="max-w-md mx-auto text-center py-12">
              <p className="text-muted-foreground mb-4">Sign in to use AI generation features</p>
              <Link to="/auth">
                <Button variant="gradient">Sign In</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-12">
            <div className="max-w-4xl mx-auto">
              {/* Generation Area */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border p-6 mb-6"
              >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  Text to Image
                </h2>
                
                <Textarea
                  placeholder="Describe the image you want to create... e.g., 'A majestic lion in a cyberpunk city at night'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] mb-4"
                />

                <div className="flex items-center gap-4 mb-4">
                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Image
                      </>
                    )}
                  </Button>
                </div>

                {/* Example Prompts */}
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Try these examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {examplePrompts.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => setPrompt(example)}
                        className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                      >
                        {example.substring(0, 40)}...
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Generated Result */}
              {generatedImage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl border border-border p-6"
                >
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    Generated Result
                  </h3>
                  <div className="rounded-xl overflow-hidden border border-border mb-4">
                    <img
                      src={generatedImage}
                      alt="Generated"
                      className="w-full max-h-[500px] object-contain bg-muted"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                    <Button
                      variant="gradient"
                      onClick={handleSaveToGallery}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save to Gallery
                    </Button>
                    <Link to="/image-editor">
                      <Button variant="outline" className="gap-2">
                        <Wand2 className="w-4 h-4" />
                        Edit Further
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* Empty state when no generation yet */}
              {!generatedImage && !isGenerating && (
                <div className="bg-card rounded-2xl border border-border p-12 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                    <ImageIcon className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No image generated yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Enter a creative prompt above and click "Generate Image" to create your AI artwork
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
