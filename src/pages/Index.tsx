import { MainLayout } from '@/components/layout/MainLayout';
import { GalleryToolbar } from '@/components/gallery/GalleryToolbar';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { useMediaGallery } from '@/hooks/useMediaGallery';
import { useAuth } from '@/contexts/AuthContext';
import heroGradient from '@/assets/hero-gradient.jpg';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

const Index = () => {
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
    toggleFavorite,
    toggleSelection,
    selectAll,
    clearSelection,
    moveToTrash,
    updatePrivacy,
    refresh,
  } = useMediaGallery();

  return (
    <MainLayout>
      {/* Hero Section */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={heroGradient}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary-foreground mb-2 drop-shadow-lg">
              AG~3 Memoria
            </h1>
            <p className="text-primary-foreground/80 drop-shadow">
              Your AI-powered image gallery
            </p>
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
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Upload className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">Sign in to view your gallery</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Create an account to start uploading and organizing your images.
            </p>
            <Link to="/auth">
              <Button variant="gradient">Get Started</Button>
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
};

export default Index;
