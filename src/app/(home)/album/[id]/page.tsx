'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/hooks/useAuth';
import { AlbumHeader } from '@/components/shared/AlbumHeader';
import { PhotoGrid } from '@/components/shared/PhotoGrid';
import Container from '@/components/common/Container';
import { Id } from '@/convex/_generated/dataModel';
import { UploadPhotosDialog } from '@/components/my-albums/UploadPhotosDialog';
import { Loader2 } from 'lucide-react';
import { useAlbums } from '@/hooks/useAlbums';
import { usePhotos } from '@/hooks/usePhotos';
import { toast } from 'sonner';

export default function AlbumPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  
  // Convert string ID to Convex ID type (safely)
  let albumId: Id<"albums"> | null = null;
  try {
    // Only attempt conversion if id exists and is a string
    if (id && typeof id === 'string') {
      albumId = id as Id<"albums">;
    }
  } catch (error) {
    console.error("Invalid album ID format:", error);
  }
  
  // Always use hooks unconditionally at the top level
  const album = useQuery(api.albums.getAlbumById, albumId ? {
    albumId,
    requestingUserId: user?._id
  } : "skip");
  
  const albumOwner = useQuery(api.users.getUserById, 
    album?.userId ? { userId: album.userId } : "skip"
  );
  
  const albumPhotos = useQuery(api.photos.getPhotosByAlbumId, albumId ? {
    albumId,
    requestingUserId: user?._id,
    sortBy: 'newest'
  } : "skip");
  
  // Album operations
  const { updateAlbum, deleteAlbum } = useAlbums();
  const { deletePhoto } = usePhotos();
  
  // Determine if current user is the owner
  const isOwner = !!user && !!album && album.userId === user._id;
  
  // Loading state
  const isLoading = !album || !albumOwner || !albumPhotos;
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-photo-primary flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-photo-indigo" />
      </div>
    );
  }
  
  // Handle album not found or not accessible
  if (!album || !albumOwner) {
    return (
      <div className="min-h-screen bg-photo-primary flex items-center justify-center flex-col">
        <h1 className="text-2xl font-bold text-photo-secondary mb-4">Album not found</h1>
        <p className="text-photo-secondary/70">
          The album you're looking for doesn't exist or you don't have permission to view it.
        </p>
      </div>
    );
  }
  
  const handleUpdateAlbum = async (updates: Partial<typeof album>) => {
    if (!albumId) return;
    
    try {
      await updateAlbum(albumId, updates);
      toast.success('Album updated successfully');
    } catch (error) {
      console.error('Error updating album:', error);
      toast.error('Failed to update album');
    }
  };
  
  const handleDeleteAlbum = async () => {
    if (!albumId) return;
    
    try {
      await deleteAlbum(albumId);
      toast.success('Album deleted successfully');
      // Navigate back to my albums
      window.location.href = '/my-albums';
    } catch (error) {
      console.error('Error deleting album:', error);
      toast.error('Failed to delete album');
    }
  };
  
  const handleDeletePhoto = async (photoId: Id<"photos">) => {
    try {
      await deletePhoto(photoId);
      toast.success('Photo deleted successfully');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };
  
  return (
    <div className="min-h-screen bg-photo-primary pb-16">
      <AlbumHeader 
        album={album}
        user={albumOwner}
        totalPhotos={albumPhotos?.photos?.length || 0}
        isOwner={isOwner}
        backUrl={isOwner ? '/my-albums' : `/user/${albumOwner._id}`}
        onUpdate={isOwner ? handleUpdateAlbum : undefined}
        onDelete={isOwner ? handleDeleteAlbum : undefined}
        onUpload={isOwner ? () => setIsUploadDialogOpen(true) : undefined}
      />
      
      <Container className="mt-8">
        <PhotoGrid 
          photos={albumPhotos?.photos || []}
          isOwner={isOwner}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onPhotoDelete={handleDeletePhoto}
          onUploadClick={isOwner ? () => setIsUploadDialogOpen(true) : undefined}
          emptyMessage={isOwner ? "This album is empty" : "This album has no photos"}
          emptyActionLabel={isOwner ? "Add Photos" : undefined}
        />
      </Container>
      
      {/* Upload Photos Dialog */}
      {isOwner && (
        <UploadPhotosDialog 
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          albumId={albumId}
          onUploadComplete={() => {
            toast.success('Photos uploaded successfully');
          }}
        />
      )}
    </div>
  );
}