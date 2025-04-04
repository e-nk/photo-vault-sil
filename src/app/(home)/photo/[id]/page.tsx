"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePhotos } from '@/hooks/usePhotos';
import { useAuth } from '@/hooks/useAuth';
import { PhotoHeader } from '@/components/photo/PhotoHeader';
import { PhotoView } from '@/components/photo/PhotoView';
import { PhotoSidebar } from '@/components/photo/PhotoSidebar';
import { PhotoLoading } from '@/components/photo/PhotoLoading';
import { notFound } from 'next/navigation';
import { toast } from 'sonner';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { use } from 'react';

interface PhotoPageProps {
  params: Promise<{ id: string }>;
}

export default function PhotoPage({ params }: PhotoPageProps) {
  // Use React.use to unwrap the params Promise
  const resolvedParams = use(params);
  const photoId = resolvedParams.id;
  
  const router = useRouter();
  const { user } = useAuth();
  
  // Photo states
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get photo data
  const {
    updatePhoto, 
    likePhoto, 
    unlikePhoto, 
    bookmarkPhoto, 
    unbookmarkPhoto
  } = usePhotos();
  
  const photoData = useQuery(api.photos.getPhotoById, { 
    photoId, 
    requestingUserId: user?._id 
  });
  
  // Get album photos for prev/next navigation
  const albumPhotos = photoData?.album ? useQuery(
    api.photos.getPhotosByAlbumId, 
    { 
      albumId: photoData.album._id, 
      requestingUserId: user?._id,
      sortBy: 'newest'
    }
  ) : null;
  
  // Set up form values when photo data is loaded
  useEffect(() => {
    if (photoData?.photo) {
      setEditedTitle(photoData.photo.title);
      setEditedDescription(photoData.photo.description || "");
    }
  }, [photoData?.photo]);
  
  // Get current photo index and prev/next photos
  const currentIndex = albumPhotos?.photos
    ? albumPhotos.photos.findIndex(p => p._id === photoId)
    : -1;
    
  const prevPhoto = currentIndex > 0 && albumPhotos?.photos 
    ? albumPhotos.photos[currentIndex - 1] 
    : null;
    
  const nextPhoto = currentIndex < (albumPhotos?.photos?.length || 0) - 1 && albumPhotos?.photos 
    ? albumPhotos.photos[currentIndex + 1] 
    : null;

  // Check if the current user is the owner
  const isOwner = user && photoData?.photo && user._id === photoData.photo.userId;
  
  // Handle navigation
  const navigateToPrevPhoto = () => {
    if (prevPhoto) {
      router.push(`/photo/${prevPhoto._id}`);
    }
  };

  const navigateToNextPhoto = () => {
    if (nextPhoto) {
      router.push(`/photo/${nextPhoto._id}`);
    }
  };
  
  // Photo edit handlers
  const handleSaveEdit = async () => {
    if (!photoData?.photo || !editedTitle.trim()) return;
    
    setIsSaving(true);
    try {
      await updatePhoto(photoData.photo._id, {
        title: editedTitle.trim(),
        description: editedDescription.trim() || undefined
      });
      
      setIsEditing(false);
      toast.success('Photo updated successfully');
    } catch (error) {
      console.error('Error updating photo:', error);
      toast.error('Failed to update photo');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Like/save handlers
  const handleToggleLike = async () => {
    if (!photoData?.photo) return;
    
    setIsLiking(true);
    try {
      if (photoData.isLiked) {
        await unlikePhoto(photoData.photo._id);
      } else {
        await likePhoto(photoData.photo._id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Action failed');
    } finally {
      setIsLiking(false);
    }
  };
  
  const handleToggleSave = async () => {
    if (!photoData?.photo) return;
    
    setIsBookmarking(true);
    try {
      if (photoData.isBookmarked) {
        await unbookmarkPhoto(photoData.photo._id);
        toast.success('Removed from saved photos');
      } else {
        await bookmarkPhoto(photoData.photo._id);
        toast.success('Added to saved photos');
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Action failed');
    } finally {
      setIsBookmarking(false);
    }
  };
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigateToPrevPhoto();
      } else if (e.key === 'ArrowRight') {
        navigateToNextPhoto();
      } else if (e.key === 'Escape' && isEditing) {
        setIsEditing(false);
        setEditedTitle(photoData?.photo?.title || "");
        setEditedDescription(photoData?.photo?.description || "");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigateToPrevPhoto, navigateToNextPhoto, isEditing, photoData?.photo]);

  // Show loading state
  if (!photoData) {
    return <PhotoLoading />;
  }
  
  // If photo not found or user doesn't have access
  if (!photoData.photo || !photoData.album || !photoData.user) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-photo-primary flex flex-col">
      {/* Photo Header */}
      <PhotoHeader 
        photo={photoData.photo}
        album={photoData.album}
        isLiked={photoData.isLiked || false}
        isSaved={photoData.isBookmarked || false}
        isOwner={!!isOwner}
        isEditing={isEditing}
        onToggleLike={handleToggleLike}
        onToggleSave={handleToggleSave}
        onStartEditing={() => setIsEditing(true)}
        isLikeLoading={isLiking}
        isSaveLoading={isBookmarking}
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Photo View */}
        <PhotoView 
          photo={photoData.photo}
          prevPhoto={prevPhoto}
          nextPhoto={nextPhoto}
          onNavigatePrev={navigateToPrevPhoto}
          onNavigateNext={navigateToNextPhoto}
        />
        
        {/* Photo Sidebar */}
        <PhotoSidebar 
          photo={photoData.photo}
          album={photoData.album}
          user={photoData.user}
          prevPhoto={prevPhoto}
          nextPhoto={nextPhoto}
          isEditing={isEditing}
          isOwner={!!isOwner}
          editedTitle={editedTitle}
          editedDescription={editedDescription}
          onTitleChange={setEditedTitle}
          onDescriptionChange={setEditedDescription}
          onCancelEdit={() => {
            setIsEditing(false);
            setEditedTitle(photoData.photo.title);
            setEditedDescription(photoData.photo.description || "");
          }}
          onSaveEdit={handleSaveEdit}
          onStartEditing={() => setIsEditing(true)}
          onNavigatePrev={navigateToPrevPhoto}
          onNavigateNext={navigateToNextPhoto}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}