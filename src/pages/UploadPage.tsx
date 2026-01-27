import { MainLayout } from '@/components/layout/MainLayout';
import { UploadZone } from '@/components/upload/UploadZone';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Upload Images</h1>
              <p className="text-muted-foreground">
                Add images to your gallery
              </p>
            </div>
          </div>

          {!user ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Please sign in to upload files</p>
              <Link to="/auth">
                <Button variant="gradient">Sign In</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Upload Zone */}
              <UploadZone onUploadComplete={() => navigate('/')} />

              {/* Tips */}
              <div className="mt-8 p-6 rounded-xl bg-muted/50">
                <h3 className="font-semibold mb-3">Tips for best results</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                    <span>Supported formats: JPG, PNG, GIF, WebP</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                    <span>Maximum file size: 50MB per image</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                    <span>You can upload multiple images at once</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                    <span>Images will be automatically organized by date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                    <span>Use AI Auto-Tag to automatically add tags to your images</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}
