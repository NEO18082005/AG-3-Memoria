import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { motion } from 'framer-motion';
import { FolderOpen, Plus, MoreHorizontal, Lock, Globe, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMediaGallery } from '@/hooks/useMediaGallery';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function AlbumsPage() {
  const { user } = useAuth();
  const { albums, createAlbum } = useMediaGallery();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const visibilityConfig = {
    private: { icon: Lock, label: 'Private' },
    shared: { icon: Link2, label: 'Shared' },
    public: { icon: Globe, label: 'Public' },
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) return;
    
    setIsCreating(true);
    await createAlbum(newAlbumName, newAlbumDescription || undefined);
    setIsCreating(false);
    setIsCreateOpen(false);
    setNewAlbumName('');
    setNewAlbumDescription('');
  };

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
            <div className="w-12 h-12 rounded-xl bg-gradient-secondary flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Albums</h1>
              <p className="text-muted-foreground">
                {albums.length} albums
              </p>
            </div>
          </div>
          
          {user && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="gradient" className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Album
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Album</DialogTitle>
                  <DialogDescription>
                    Organize your media into albums for easy access.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Album Name</Label>
                    <Input
                      id="name"
                      value={newAlbumName}
                      onChange={(e) => setNewAlbumName(e.target.value)}
                      placeholder="My Album"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                      id="description"
                      value={newAlbumDescription}
                      onChange={(e) => setNewAlbumDescription(e.target.value)}
                      placeholder="Album description..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="gradient"
                    onClick={handleCreateAlbum}
                    disabled={!newAlbumName.trim() || isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Create Album'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </motion.div>
      </div>

      {/* Albums Grid */}
      <div className="px-6 pb-12">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground mb-4">Sign in to view your albums</p>
            <Link to="/auth">
              <Button variant="gradient">Sign In</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Create New Album Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4 }}
              onClick={() => setIsCreateOpen(true)}
              className="group aspect-square rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-all"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Create Album
              </p>
            </motion.div>

            {/* Album Cards */}
            {albums.map((album, index) => {
              const VisibilityIcon = visibilityConfig[album.privacy_level].icon;
              
              return (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-soft hover:shadow-medium transition-all"
                >
                  {/* Cover Image */}
                  {album.cover_image_url ? (
                    <img
                      src={album.cover_image_url}
                      alt={album.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-muted flex items-center justify-center">
                      <FolderOpen className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />

                  {/* Top Actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm">
                      <VisibilityIcon className="w-4 h-4 text-foreground" />
                    </div>
                    <button className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background transition-colors">
                      <MoreHorizontal className="w-4 h-4 text-foreground" />
                    </button>
                  </div>

                  {/* Bottom Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-semibold text-background mb-1">{album.name}</h3>
                    <p className="text-sm text-background/70">
                      {album.item_count || 0} items
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
