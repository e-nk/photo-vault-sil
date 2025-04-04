'use client';

import { useState } from 'react';
import { api } from '@/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';
import { useFileUpload, getImageAspectRatio } from '@/lib/upload';

export function usePhotos() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  
  // File upload utilities
  const { uploadFile } = useFileUpload();

  // Convex mutations
  const updatePhotoMutation = useMutation(api.photos.updatePhoto);
  const deletePhotoMutation = useMutation(api.photos.deletePhoto);
  const likePhotoMutation = useMutation(api.photos.likePhoto);
  const unlikePhotoMutation = useMutation(api.photos.unlikePhoto);
  const bookmarkPhotoMutation = useMutation(api.photos.bookmarkPhoto);
  const unbookmarkPhotoMutation = useMutation(api.photos.unbookmarkPhoto);
  const addCommentMutation = useMutation(api.photos.addComment);
  const deleteCommentMutation = useMutation(api.photos.deleteComment);
  
  // Get a single photo with all related data
  const getPhoto = (photoId: Id<"photos">) => useQuery(
    api.photos.getPhotoById, 
    { photoId, requestingUserId: user?._id }
  );
  
  // Get photos for an album
  const getAlbumPhotos = (albumId: Id<"albums">) => useQuery(
    api.photos.getPhotosByAlbumId, 
    { albumId, requestingUserId: user?._id, sortBy: 'newest' }
  );
  
  // Get photos for a user
  const getUserPhotos = (userId: Id<"users">) => useQuery(
    api.photos.getPhotosByUserId, 
    { userId, requestingUserId: user?._id }
  );
  
  // Get comments for a photo
  const getPhotoComments = (photoId: Id<"photos">) => useQuery(
    api.photos.getCommentsByPhotoId,
    { photoId }
  );
  
  // Get bookmarked photos
  const getBookmarkedPhotos = () => useQuery(
    api.photos.getBookmarkedPhotos,
    user ? { userId: user._id } : "skip"
  );
  
  // Upload a photo to an album
  const uploadPhoto = async (file: File, albumId: Id<"albums">, title: string, description?: string) => {
    if (!user) {
      toast.error('You must be logged in to upload photos');
      return null;
    }
    
    try {
      // Upload file to storage
      const { storageId } = await uploadFile(file);
      
      // Get aspect ratio
      const aspectRatio = await getImageAspectRatio(file);
      
      // Add photo to the database
      const result = await useMutation(api.storage.uploadPhoto)({
        albumId,
        userId: user._id,
        title,
        description,
        storageId,
        aspectRatio
      });
      
      return result;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
      return null;
    }
  };
  
  // Update a photo's details
  const updatePhoto = async (photoId: Id<"photos">, updates: { title?: string; description?: string }) => {
    if (!user) {
      toast.error('You must be logged in to update photos');
      return false;
    }
    
    try {
      setIsUpdating(true);
      
      await updatePhotoMutation({
        photoId,
        userId: user._id,
        ...updates
      });
      
      toast.success('Photo updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating photo:', error);
      toast.error('Failed to update photo');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Delete a photo
  const deletePhoto = async (photoId: Id<"photos">) => {
    if (!user) {
      toast.error('You must be logged in to delete photos');
      return false;
    }
    
    try {
      setIsDeleting(true);
      
      await deletePhotoMutation({
        photoId,
        userId: user._id
      });
      
      toast.success('Photo deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Like a photo
  const likePhoto = async (photoId: Id<"photos">) => {
    if (!user) {
      toast.error('You must be logged in to like photos');
      return false;
    }
    
    try {
      setIsLiking(true);
      
      await likePhotoMutation({
        photoId,
        userId: user._id
      });
      
      return true;
    } catch (error) {
      console.error('Error liking photo:', error);
      toast.error('Failed to like photo');
      return false;
    } finally {
      setIsLiking(false);
    }
  };
  
  // Unlike a photo
  const unlikePhoto = async (photoId: Id<"photos">) => {
    if (!user) return false;
    
    try {
      setIsLiking(true);
      
      await unlikePhotoMutation({
        photoId,
        userId: user._id
      });
      
      return true;
    } catch (error) {
      console.error('Error unliking photo:', error);
      toast.error('Failed to unlike photo');
      return false;
    } finally {
      setIsLiking(false);
    }
  };
  
  // Bookmark a photo
  const bookmarkPhoto = async (photoId: Id<"photos">) => {
    if (!user) {
      toast.error('You must be logged in to bookmark photos');
      return false;
    }
    
    try {
      setIsBookmarking(true);
      
      await bookmarkPhotoMutation({
        photoId,
        userId: user._id
      });
      
      return true;
    } catch (error) {
      console.error('Error bookmarking photo:', error);
      toast.error('Failed to bookmark photo');
      return false;
    } finally {
      setIsBookmarking(false);
    }
  };
  
  // Remove a bookmark
  const unbookmarkPhoto = async (photoId: Id<"photos">) => {
    if (!user) return false;
    
    try {
      setIsBookmarking(true);
      
      await unbookmarkPhotoMutation({
        photoId,
        userId: user._id
      });
      
      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error('Failed to remove bookmark');
      return false;
    } finally {
      setIsBookmarking(false);
    }
  };
  
  // Add a comment to a photo
  const addComment = async (photoId: Id<"photos">, content: string) => {
    if (!user) {
      toast.error('You must be logged in to comment');
      return null;
    }
    
    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return null;
    }
    
    try {
      setIsCommenting(true);
      
      const commentId = await addCommentMutation({
        photoId,
        userId: user._id,
        content: content.trim()
      });
      
      return commentId;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
      return null;
    } finally {
      setIsCommenting(false);
    }
  };
  
  // Delete a comment
  const deleteComment = async (commentId: Id<"comments">) => {
    if (!user) return false;
    
    try {
      await deleteCommentMutation({
        commentId,
        userId: user._id
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
      return false;
    }
  };

  return {
    getPhoto,
    getAlbumPhotos,
    getUserPhotos,
    getPhotoComments,
    getBookmarkedPhotos,
    uploadPhoto,
    updatePhoto,
    deletePhoto,
    likePhoto,
    unlikePhoto,
    bookmarkPhoto,
    unbookmarkPhoto,
    addComment,
    deleteComment,
    isUpdating,
    isDeleting,
    isLiking,
    isCommenting,
    isBookmarking,
    isLoading: isAuthLoading
  };
}