"use client";

import React, { useState, useMemo } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AlbumHeader } from '@/components/shared/AlbumHeader';
import { PhotoGrid } from '@/components/shared/PhotoGrid';
import { UploadPhotosDialog } from '@/components/my-albums/UploadPhotosDialog';
import { toast } from 'sonner';
import Container from '@/components/common/Container';
import { Check, Trash, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface AlbumPageProps {
  params: {
    id: string;
  };
}

export default function AlbumPage({ params }: AlbumPageProps) {
  // Extract the album ID from params
  const albumId = params.id;
  const router = useRouter();
  const { user } = useAuth();
  
  // Upload dialog state
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  
  // Memoize queries to maintain consistent hook calls
  const albumQuery = useQuery(api.albums.getAlbumById, { 
    albumId, 
    requestingUserId: user?._id ?? undefined 
  });
  
  const photosResult = useQuery(api.photos.getPhotosByAlbumId, {
    albumId,
    requestingUserId: user?._id ?? undefined,
    sortBy: 'newest'
  });
  
  // Safely get album owner data
  const albumOwner = useMemo(() => {
    return albumQuery?.userId 
      ? useQuery(api.users.getUserById, { userId: albumQuery.userId })
      : null;
  }, [albumQuery?.userId]);
  
  // Mutations
  const updateAlbumMutation = useMutation(api.albums.updateAlbum);
  const deleteAlbumMutation = useMutation(api.albums.deleteAlbum);
  
  // Check if the current user is the owner
  const isOwner = useMemo(() => {
    return user && albumQuery && user._id === albumQuery.userId;
  }, [user, albumQuery]);
  
  // Handle album updates
  const handleUpdateAlbum = async (updates: any) => {
    if (!albumQuery || !isOwner || !user) return;
    
    try {
      await updateAlbumMutation({
        albumId: albumQuery._id,
        ...updates,
      });
      
      toast.success('Album updated', {
        description: 'Your changes have been saved.',
        icon: <Check className="h-4 w-4" />,
      });
    } catch (error) {
      console.error('Error updating album:', error);
      toast.error('Failed to update album');
    }
  };
  
  // Handle album deletion
  const handleDeleteAlbum = async () => {
    if (!albumQuery || !isOwner || !user) return;
    
    try {
      await deleteAlbumMutation({
        albumId: albumQuery._id,
        userId: user._id,
      });
      
      toast('Album deleted', {
        description: `"${albumQuery.title}" has been permanently deleted.`,
        icon: <Trash className="h-4 w-4" />,
      });
      
      // Navigate back to my albums
      router.push('/my-albums');
    } catch (error) {
      console.error('Error deleting album:', error);
      toast.error('Failed to delete album');
    }
  };
  
  // Show loading state
  if (!albumQuery || !albumOwner) {
    return (
      <div className="min-h-screen bg-photo-primary flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-photo-indigo/30 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // If album not found or user doesn't have access
  if (!albumQuery) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-photo-primary">
      <AlbumHeader 
        album={albumQuery}
        user={albumOwner}
        totalPhotos={photosResult?.photos?.length || 0}
        isOwner={!!isOwner}
        backUrl={isOwner ? "/my-albums" : `/user/${albumOwner._id}`}
        onUpdate={isOwner ? handleUpdateAlbum : undefined}
        onDelete={isOwner ? handleDeleteAlbum : undefined}
        onUpload={isOwner ? () => setIsUploadDialogOpen(true) : undefined}
      />
      
      <Container className="py-8">
        {!photosResult ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-photo-indigo" />
          </div>
        ) : (
          <PhotoGrid 
            photos={photosResult.photos || []}
            isLoading={false}
            isOwner={!!isOwner}
            onPhotoDelete={isOwner ? undefined : undefined}
            onUploadClick={isOwner ? () => setIsUploadDialogOpen(true) : undefined}
            emptyMessage={isOwner ? "This album is empty" : "No photos in this album yet"}
            emptyActionLabel={isOwner ? "Upload Photos" : undefined}
          />
        )}
      </Container>
      
      {/* Upload Photos Dialog - Only for owners */}
      {isOwner && (
        <UploadPhotosDialog 
          isOpen={isUploadDialogOpen}
          onClose={() => setIsUploadDialogOpen(false)}
          albumId={albumQuery._id}
          onUploadComplete={() => setIsUploadDialogOpen(false)}
        />
      )}
    </div>
  );
}