import { useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaGallery } from '@/hooks/useMediaGallery';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

export default function TrashPage() {
  const { user } = useAuth();
  const { 
    media, 
    loading, 
    setShowTrashedOnly, 
    restoreFromTrash, 
    permanentlyDelete,
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useMediaGallery();

  useEffect(() => {
    setShowTrashedOnly(true);
    return () => setShowTrashedOnly(false);
  }, [setShowTrashedOnly]);

  const handleEmptyTrash = async () => {
    if (media.length === 0) return;
    if (confirm('Are you sure you want to permanently delete all items in trash? This cannot be undone.')) {
      await permanentlyDelete(media.map(m => m.id));
    }
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
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Trash</h1>
              <p className="text-muted-foreground">
                Items are permanently deleted after 30 days
              </p>
            </div>
          </div>
          
          {user && media.length > 0 && (
            <Button variant="destructive" className="gap-2" onClick={handleEmptyTrash}>
              <Trash2 className="w-4 h-4" />
              Empty Trash
            </Button>
          )}
        </motion.div>
      </div>

      {/* Content */}
      <div className="px-6 pb-12">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground mb-4">Sign in to view your trash</p>
            <Link to="/auth">
              <Button variant="gradient">Sign In</Button>
            </Link>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : media.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Trash2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">Trash is empty</h3>
            <p className="text-muted-foreground max-w-sm">
              Deleted items will appear here. You can restore them or permanently delete them.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Selection bar */}
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                <span className="text-sm font-medium">{selectedItems.length} selected</span>
                <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>Clear</Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => restoreFromTrash(selectedItems)}
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => {
                    if (confirm('Permanently delete selected items?')) {
                      permanentlyDelete(selectedItems);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Forever
                </Button>
              </div>
            )}

            {/* Trashed items */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {media.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group ${
                    selectedItems.includes(item.id) ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => toggleSelection(item.id)}
                >
                  <img
                    src={item.file_url}
                    alt={item.title || item.file_name}
                    className="w-full h-full object-cover opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreFromTrash([item.id]);
                        }}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
