import { useState, useMemo } from 'react';
import { MediaItem, Album, ViewMode, SortBy, SortOrder } from '@/types/gallery';

// Import sample images
import sample1 from '@/assets/sample-1.jpg';
import sample2 from '@/assets/sample-2.jpg';
import sample3 from '@/assets/sample-3.jpg';
import sample4 from '@/assets/sample-4.jpg';
import sample5 from '@/assets/sample-5.jpg';
import sample6 from '@/assets/sample-6.jpg';

// Sample data
const sampleMedia: MediaItem[] = [
  {
    id: '1',
    type: 'image',
    src: sample1,
    title: 'Ocean Sunset',
    description: 'Beautiful sunset over the ocean',
    tags: ['nature', 'sunset', 'ocean'],
    isFavorite: true,
    visibility: 'public',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    width: 800,
    height: 1200,
  },
  {
    id: '2',
    type: 'image',
    src: sample2,
    title: 'Modern Architecture',
    description: 'Contemporary building design',
    tags: ['architecture', 'urban', 'minimal'],
    isFavorite: false,
    visibility: 'public',
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14'),
    width: 1024,
    height: 768,
  },
  {
    id: '3',
    type: 'image',
    src: sample3,
    title: 'Street Art',
    description: 'Colorful urban graffiti',
    tags: ['art', 'urban', 'colorful'],
    isFavorite: true,
    visibility: 'public',
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-13'),
    width: 1024,
    height: 1024,
  },
  {
    id: '4',
    type: 'image',
    src: sample4,
    title: 'Butterfly Macro',
    description: 'Close-up of a beautiful butterfly',
    tags: ['nature', 'macro', 'wildlife'],
    isFavorite: false,
    visibility: 'private',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
    width: 800,
    height: 600,
  },
  {
    id: '5',
    type: 'image',
    src: sample5,
    title: 'Mountain Sunrise',
    description: 'Epic mountain peaks at sunrise',
    tags: ['nature', 'mountains', 'landscape'],
    isFavorite: true,
    visibility: 'public',
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11'),
    width: 1200,
    height: 800,
  },
  {
    id: '6',
    type: 'image',
    src: sample6,
    title: 'Neon City',
    description: 'Cyberpunk urban nightscape',
    tags: ['urban', 'night', 'neon'],
    isFavorite: false,
    visibility: 'shared',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    width: 600,
    height: 900,
  },
];

const sampleAlbums: Album[] = [
  {
    id: 'a1',
    name: 'Nature Collection',
    description: 'Beautiful nature photography',
    coverImage: sample1,
    itemCount: 3,
    visibility: 'public',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'a2',
    name: 'Urban Shots',
    description: 'City and architecture photos',
    coverImage: sample2,
    itemCount: 2,
    visibility: 'private',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-14'),
  },
  {
    id: 'a3',
    name: 'Favorites',
    description: 'My best photos',
    coverImage: sample5,
    itemCount: 3,
    visibility: 'shared',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-13'),
  },
];

export function useGallery() {
  const [media, setMedia] = useState<MediaItem[]>(sampleMedia);
  const [albums, setAlbums] = useState<Album[]>(sampleAlbums);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('masonry');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const filteredMedia = useMemo(() => {
    let filtered = [...media];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by album
    if (activeAlbum) {
      filtered = filtered.filter((item) => item.albumId === activeAlbum);
    }

    // Filter by favorites
    if (showFavoritesOnly) {
      filtered = filtered.filter((item) => item.isFavorite);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [media, searchQuery, activeAlbum, showFavoritesOnly, sortBy, sortOrder]);

  const toggleFavorite = (id: string) => {
    setMedia((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  };

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedItems(filteredMedia.map((item) => item.id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const deleteItems = (ids: string[]) => {
    setMedia((prev) => prev.filter((item) => !ids.includes(item.id)));
    setSelectedItems([]);
  };

  const addMedia = (items: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const now = new Date();
    const newItems = items.map((item, index) => ({
      ...item,
      id: `new-${Date.now()}-${index}`,
      createdAt: now,
      updatedAt: now,
    }));
    setMedia((prev) => [...newItems, ...prev]);
  };

  return {
    media: filteredMedia,
    albums,
    selectedItems,
    viewMode,
    sortBy,
    sortOrder,
    searchQuery,
    activeAlbum,
    showFavoritesOnly,
    setViewMode,
    setSortBy,
    setSortOrder,
    setSearchQuery,
    setActiveAlbum,
    setShowFavoritesOnly,
    toggleFavorite,
    toggleSelection,
    selectAll,
    clearSelection,
    deleteItems,
    addMedia,
  };
}
