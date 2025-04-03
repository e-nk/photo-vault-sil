'use client';

import { useState } from 'react';
import { api } from '@/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';

export function useAlbums() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Convex queries and mutations
  const createAlbumMutation = useMutation(api.albums.createAlbum);
  const updateAlbumMutation = useMutation(api.albums.updateAlbum);
  const deleteAlbumMutation = useMutation(api.albums.deleteAlbum);
  const updateAlbumCoverMutation = useMutation(api.albums.updateAlbumCover);
  
  // Get user's albums
  const myAlbums = useQuery(
    api.albums.getAlbumsByUserId,
    user ? { 
      userId: user._id, 
      requestingUserId: user._id,
      sortBy: 'updated',
      sortOrder: 'desc'
    } : "skip"
  );

  // Get albums for another user
  const getUserAlbums = (userId: Id<"users">) => 
    useQuery(api.albums.getAlbumsByUserId, { 
      userId, 
      requestingUserId: user?._id,
      sortBy: 'newest',
      sortOrder: 'desc'
    });

  // Get a specific album
  const getAlbum = (albumId: Id<"albums">) => 
    useQuery(api.albums.getAlbumById, { 
      albumId, 
      requestingUserId: user?._id 
    });

  // Create a new album
  const createAlbum = async (title: string, description?: string, isPrivate: boolean = false) => {
    if (!user) {
      toast.error('You must be logged in to create an album');
      return null;
    }
    
    try {
      setIsCreating(true);
      const albumId = await createAlbumMutation({
        title,
        description,
        isPrivate,
        userId: user._id,
      });
      
      toast.success('Album created successfully');
      return albumId;
    } catch (error) {
      console.error('Error creating album:', error);
      toast.error('Failed to create album');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  // Update an existing album
  const updateAlbum = async (
    albumId: Id<"albums">, 
    updates: { title?: string; description?: string; isPrivate?: boolean }
  ) => {
    if (!user) {
      toast.error('You must be logged in to update an album');
      return false;
    }
    
    try {
      setIsUpdating(true);
      await updateAlbumMutation({
        albumId,
        ...updates,
      });
      
      toast.success('Album updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating album:', error);
      toast.error('Failed to update album');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete an album
  const deleteAlbum = async (albumId: Id<"albums">) => {
    if (!user) {
      toast.error('You must be logged in to delete an album');
      return false;
    }
    
    try {
      setIsDeleting(true);
      await deleteAlbumMutation({
        albumId,
        userId: user._id,
      });
      
      toast.success('Album deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting album:', error);
      toast.error('Failed to delete album');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  // Update album cover
  const updateAlbumCover = async (albumId: Id<"albums">, coverImageUrl: string) => {
    if (!user) {
      toast.error('You must be logged in to update an album cover');
      return false;
    }
    
    try {
      await updateAlbumCoverMutation({
        albumId,
        coverImageUrl,
        userId: user._id,
      });
      
      toast.success('Album cover updated');
      return true;
    } catch (error) {
      console.error('Error updating album cover:', error);
      toast.error('Failed to update album cover');
      return false;
    }
  };

  return {
    myAlbums,
    getUserAlbums,
    getAlbum,
    createAlbum,
    updateAlbum,
    deleteAlbum,
    updateAlbumCover,
    isCreating,
    isUpdating,
    isDeleting,
    isLoading: isAuthLoading,
  };
}