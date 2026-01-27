import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Image, FileUp, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMediaGallery } from '@/hooks/useMediaGallery';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UploadZoneProps {
  onUploadComplete?: () => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const { user } = useAuth();
  const { uploadFile, refresh } = useMediaGallery();
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<
    { file: File; progress: number; status: 'uploading' | 'complete' | 'error'; error?: string }[]
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  // File validation constants - Images only
  const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  const getFileExtension = (filename: string): string => {
    return filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  };

  const sanitizeFilename = (filename: string): string => {
    // Remove any path traversal attempts and invalid characters
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
  };

  const processFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !user) {
        if (!user) {
          toast.error('Please sign in to upload files');
        }
        return;
      }

      const validFiles = Array.from(files).filter((file) => {
        const isImage = file.type.startsWith('image/');
        const ext = getFileExtension(file.name);

        // Validate file type - Images only
        if (!isImage) {
          toast.error(`${file.name}: Only images are allowed.`);
          return false;
        }

        // Validate file extension matches type
        if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
          toast.error(`${file.name}: Invalid image format. Allowed: JPG, PNG, GIF, WebP`);
          return false;
        }

        // Validate file size
        if (file.size > MAX_IMAGE_SIZE) {
          toast.error(`${file.name}: Image exceeds 50MB limit`);
          return false;
        }

        return true;
      });

      if (validFiles.length === 0) {
        return;
      }

      // Initialize upload state
      const newUploadingFiles = validFiles.map((file) => ({
        file,
        progress: 0,
        status: 'uploading' as const,
      }));
      setUploadingFiles(newUploadingFiles);

      // Process each file
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadingFiles((prev) =>
            prev.map((f, idx) =>
              idx === i && f.progress < 90 ? { ...f, progress: f.progress + 10 } : f
            )
          );
        }, 200);

        try {
          const result = await uploadFile(file);
          clearInterval(progressInterval);
          
          if (result) {
            setUploadingFiles((prev) =>
              prev.map((f, idx) =>
                idx === i ? { ...f, progress: 100, status: 'complete' } : f
              )
            );
          } else {
            setUploadingFiles((prev) =>
              prev.map((f, idx) =>
                idx === i ? { ...f, status: 'error', error: 'Upload failed' } : f
              )
            );
          }
        } catch (error) {
          clearInterval(progressInterval);
          setUploadingFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: 'error', error: 'Upload failed' } : f
            )
          );
        }
      }

      // Refresh gallery
      refresh();
      if (onUploadComplete) {
        onUploadComplete();
      }
    },
    [user, uploadFile, refresh, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files);
    },
    [processFiles]
  );

  const removeFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <motion.div
        initial={false}
        animate={{
          scale: isDragActive ? 1.02 : 1,
          borderColor: isDragActive
            ? 'hsl(var(--primary))'
            : 'hsl(var(--muted-foreground) / 0.3)',
        }}
        className={cn(
          'drop-zone relative rounded-2xl p-12 text-center cursor-pointer transition-colors',
          isDragActive && 'active'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />

        <motion.div
          animate={{
            y: isDragActive ? -10 : 0,
          }}
          className="flex flex-col items-center"
        >
          <div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors',
              isDragActive ? 'bg-primary/10' : 'bg-muted'
            )}
          >
            <Upload
              className={cn(
                'w-8 h-8 transition-colors',
                isDragActive ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </div>

          <h3 className="text-lg font-semibold mb-2">
            {isDragActive ? 'Drop your images here' : 'Upload Images'}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Drag and drop your images, or click to browse
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Image className="w-4 h-4" />
              <span>JPG, PNG, GIF, WebP</span>
            </div>
          </div>

          <Button variant="gradient" className="mt-6 gap-2">
            <FileUp className="w-4 h-4" />
            Choose Images
          </Button>
        </motion.div>
      </motion.div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((upload, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Image className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${upload.progress}%` }}
                      className={cn(
                        'h-full rounded-full',
                        upload.status === 'complete'
                          ? 'bg-success'
                          : upload.status === 'error'
                          ? 'bg-destructive'
                          : 'bg-gradient-primary'
                      )}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10">
                    {Math.round(upload.progress)}%
                  </span>
                </div>
              </div>

              {upload.status === 'complete' ? (
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                  <Check className="w-4 h-4 text-success" />
                </div>
              ) : upload.status === 'error' ? (
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
