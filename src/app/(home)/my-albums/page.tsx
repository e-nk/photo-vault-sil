"use client";

import React, { useState } from 'react';
import Container from '@/components/common/Container';
import { MyAlbumsHeader } from '@/components/my-albums/MyAlbumsHeader';
import { MyAlbumsGrid } from '@/components/my-albums/MyAlbumsGrid';
import { MyAlbumsEmptyState } from '@/components/my-albums/MyAlbumsEmptyState';
import { UploadPhotosDialog } from '@/components/my-albums/UploadPhotosDialog';
import { useAlbums } from '@/hooks/useAlbums';
import { useAuth } from '@/hooks/useAuth';
import AuthCheck from '@/components/auth/AuthCheck';
import { Id } from '@/convex/_generated/dataModel';
import { useRouter } from 'next/navigation';

type SortOption = 'newest' | 'oldest' | 'a-z' | 'z-a' | 'most-photos' | 'recently-updated';

export default function MyAlbumsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    myAlbums, 
    createAlbum, 
    updateAlbum, 
    deleteAlbum, 
    isLoading: isAlbumsLoading 
  } = useAlbums();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('recently-updated');
  
  // Upload dialog state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<Id<"albums"> | null>(null);
  
  // Filter and sort albums
  const filteredAlbums = myAlbums?.albums
    ? myAlbums.albums.filter(album => 
        album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (album.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
      )
    : [];
  
  // Handle album creation
  const handleCreateAlbum = async (title: string, description: string, isPrivate: boolean) => {
    const albumId = await createAlbum(title, description, isPrivate);
    if (albumId) {
      // Navigate to the new album
      router.push(`/album/${albumId}`);
    }
  };
  
  // Handle album updates
  const handleUpdateAlbum = async (albumId: Id<"albums">, updates: any) => {
    await updateAlbum(albumId, updates);
  };
  
  // Handle album deletion
  const handleDeleteAlbum = async (albumId: Id<"albums">) => {
    const success = await deleteAlbum(albumId);
    if (success) {
      // Stay on the page, the UI will update automatically via Convex subscription
    }
  };
  
  // Handle photo upload
  const handleAddPhotos = (albumId: Id<"albums">) => {
    setSelectedAlbumId(albumId);
    setIsUploadDialogOpen(true);
  };
  
  // Convert Convex sort option to API parameter
  const getSortParams = (option: SortOption): { sortBy: string, sortOrder: string } => {
    switch (option) {
      case 'newest':
        return { sortBy: 'dateCreated', sortOrder: 'desc' };
      case 'oldest':
        return { sortBy: 'dateCreated', sortOrder: 'asc' };
      case 'a-z':
        return { sortBy: 'title', sortOrder: 'asc' };
      case 'z-a':
        return { sortBy: 'title', sortOrder: 'desc' };
      case 'most-photos':
        return { sortBy: 'photoCount', sortOrder: 'desc' };
      case 'recently-updated':
        return { sortBy: 'dateUpdated', sortOrder: 'desc' };
      default:
        return { sortBy: 'dateUpdated', sortOrder: 'desc' };
    }
  };
  
  return (
    <AuthCheck>
      <div className="min-h-screen bg-photo-primary pb-16">
        {/* Header section */}
        <MyAlbumsHeader
          albumCount={filteredAlbums.length}
          searchTerm={searchTerm}
          sortOption={sortOption}
          onSearchChange={setSearchTerm}
          onSortChange={(value) => setSortOption(value as SortOption)}
          onCreateAlbum={handleCreateAlbum}
        />
        
        {/* Main content */}
        <Container className="mt-8">
          {!myAlbums || isAlbumsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div 
                  key={index} 
                  className="bg-photo-darkgray/10 rounded-lg border border-photo-border/20 animate-pulse"
                  style={{ height: '300px' }} 
                />
              ))}
            </div>
          ) : myAlbums.albums.length === 0 ? (
            <MyAlbumsEmptyState 
              onCreateAlbum={() => {
                document.getElementById('create-album-dialog-trigger')?.click();
              }} 
            />
          ) : (
            <MyAlbumsGrid 
              albums={filteredAlbums}
              isLoading={isAlbumsLoading}
              searchTerm={searchTerm}
              onCreateAlbum={() => {
                document.getElementById('create-album-dialog-trigger')?.click();
              }}
              onUpdateAlbum={handleUpdateAlbum}
              onDeleteAlbum={handleDeleteAlbum}
              onAddPhotos={handleAddPhotos}
            />
          )}
        </Container>
        
        {/* Upload Photos Dialog */}
        <UploadPhotosDialog 
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          albumId={selectedAlbumId}
          onUploadComplete={() => {
            setIsUploadDialogOpen(false);
            setSelectedAlbumId(null);
          }}
        />
        
        {/* Hidden trigger for create album dialog */}
        <button 
          id="create-album-dialog-trigger" 
          className="hidden"
          onClick={() => {
            document.querySelector<HTMLButtonElement>('[data-dialog-trigger="create-album"]')?.click();
          }}
        />
      </div>
    </AuthCheck>
  );
}