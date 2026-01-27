import { useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { GalleryToolbar } from '@/components/gallery/GalleryToolbar';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { useMediaGallery } from '@/hooks/useMediaGallery';
import { useAuth } from '@/contexts/AuthContext';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function FavoritesPage() {
  const { user } = useAuth();
  const {
    media,
    selectedItems,
    viewMode,
    sortBy,
    sortOrder,
    searchQuery,
    loading,
    setViewMode,
    setSortBy,
    setSortOrder,
    setSearchQuery,
    setShowFavoritesOnly,
    toggleFavorite,
    toggleSelection,
    selectAll,
    clearSelection,
    moveToTrash,
    updatePrivacy,
    refresh,
  } = useMediaGallery();

  // Filter to favorites only
  useEffect(() => {
    setShowFavoritesOnly(true);
    return () => setShowFavoritesOnly(false);
  }, [setShowFavoritesOnly]);

  return (
    <MainLayout>
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center">
            <Star className="w-6 h-6 text-primary-foreground fill-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Favorites</h1>
            <p className="text-muted-foreground">Your starred media</p>
          </div>
        </motion.div>
      </div>

      {/* Toolbar */}
      <GalleryToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        selectedCount={selectedItems.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onDeleteSelected={() => moveToTrash(selectedItems)}
        totalCount={media.length}
      />

      {/* Gallery Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground mb-4">Sign in to view your favorites</p>
            <Link to="/auth">
              <Button variant="gradient">Sign In</Button>
            </Link>
          </div>
        ) : (
          <GalleryGrid
            items={media}
            viewMode={viewMode}
            selectedItems={selectedItems}
            onToggleSelection={toggleSelection}
            onToggleFavorite={toggleFavorite}
            onDelete={moveToTrash}
            onUpdatePrivacy={updatePrivacy}
            onRefresh={refresh}
          />
        )}
      </div>
    </MainLayout>
  );
}
