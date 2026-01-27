export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  src: string;
  thumbnail?: string;
  title: string;
  description?: string;
  tags: string[];
  albumId?: string;
  isFavorite: boolean;
  visibility: 'private' | 'shared' | 'public';
  createdAt: Date;
  updatedAt: Date;
  width?: number;
  height?: number;
  size?: number;
  duration?: number; // for videos, in seconds
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  itemCount: number;
  visibility: 'private' | 'shared' | 'public';
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
}

export type ViewMode = 'grid' | 'masonry' | 'list';
export type SortBy = 'date' | 'name' | 'size';
export type SortOrder = 'asc' | 'desc';
