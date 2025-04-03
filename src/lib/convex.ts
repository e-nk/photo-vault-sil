import { api } from '@/convex/_generated/api';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { useAuth } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';

/**
 * Custom hook to get the current user's profile from Convex
 */
export function useCurrentUser() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const user = useQuery(api.auth.getMe);
  const syncUser = useMutation(api.auth.syncUserProfile);
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  // Sync user profile with Clerk data
  useEffect(() => {
    if (isAuthenticated && isClerkLoaded && clerkUser && !user) {
      syncUser();
    }
  }, [isAuthenticated, isClerkLoaded, clerkUser, user, syncUser]);

  return {
    user,
    isLoading: isAuthLoading || !isClerkLoaded,
    isAuthenticated,
  };
}

/**
 * Custom hook to handle albums
 */
export function useAlbums() {
  const { user } = useCurrentUser();
  
  // Queries
  const myAlbums = useQuery(
    api.albums.getAlbumsByUserId,
    user ? { userId: user._id, requestingUserId: user._id } : "skip"
  );
  
  // Mutations
  const createAlbum = useMutation(api.albums.createAlbum);
  const updateAlbum = useMutation(api.albums.updateAlbum);
  const deleteAlbum = useMutation(api.albums.deleteAlbum);
  const updateAlbumCover = useMutation(api.albums.updateAlbumCover);
  
  // Album actions
  const handleCreateAlbum = async (title: string, description: string, isPrivate: boolean) => {
    if (!user) return null;
    
    return await createAlbum({
      title,
      description,
      isPrivate,
      userId: user._id,
    });
  };
  
  const handleUpdateAlbum = async (
    albumId: string, 
    updates: { title?: string; description?: string; isPrivate?: boolean }
  ) => {
    return await updateAlbum({
      albumId,
      ...updates,
    });
  };
  
  const handleDeleteAlbum = async (albumId: string) => {
    if (!user) return null;
    
    return await deleteAlbum({
      albumId,
      userId: user._id,
    });
  };
  
  return {
    myAlbums,
    createAlbum: handleCreateAlbum,
    updateAlbum: handleUpdateAlbum,
    deleteAlbum: handleDeleteAlbum,
    updateAlbumCover,
  };
}

/**
 * Custom hook to handle photos
 */
export function usePhotos() {
  const { user } = useCurrentUser();
  
  // Mutations
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const uploadPhoto = useMutation(api.storage.uploadPhoto);
  const uploadMultiplePhotos = useMutation(api.storage.uploadMultiplePhotos);
  const updatePhoto = useMutation(api.photos.updatePhoto);
  const deletePhoto = useMutation(api.photos.deletePhoto);
  const likePhoto = useMutation(api.photos.likePhoto);
  const unlikePhoto = useMutation(api.photos.unlikePhoto);
  const bookmarkPhoto = useMutation(api.photos.bookmarkPhoto);
  const unbookmarkPhoto = useMutation(api.photos.unbookmarkPhoto);
  const addComment = useMutation(api.photos.addComment);
  const deleteComment = useMutation(api.photos.deleteComment);
  const validateImageFile = useMutation(api.storage.validateImageFile);
  
  // Helper function to upload a photo
  const handleUploadPhoto = async (
    file: File,
    albumId: string,
    title: string,
    description?: string
  ) => {
    if (!user) return null;

    try {
      // Validate the file
      await validateImageFile({
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      
      // Get the upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload the file to storage
      const result = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error("Failed to upload file");
      }
      
      // Get the file dimensions to calculate aspect ratio
      const aspectRatio = await getImageAspectRatio(file);
      
      // Save the photo in the database
      const { photoId, url } = await uploadPhoto({
        albumId,
        userId: user._id,
        title,
        description,
        storageId: uploadUrl.split("/").pop()!,
        aspectRatio,
      });
      
      return { photoId, url };
    } catch (error) {
      console.error("Error uploading photo:", error);
      throw error;
    }
  };
  
  // Helper function to get image dimensions
  const getImageAspectRatio = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img.width / img.height);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve(1.5); // Default aspect ratio if can't determine
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
  };
  
  // Helper function to upload multiple photos
  const handleUploadMultiplePhotos = async (
    files: File[],
    albumId: string,
    defaultTitle: string
  ) => {
    if (!user || files.length === 0) return null;

    // First, upload all files to storage and get their metadata
    const photoData = await Promise.all(
      files.map(async (file, index) => {
        try {
          // Validate the file
          await validateImageFile({
            filename: file.name,
            fileSize: file.size,
            mimeType: file.type,
          });
          
          // Get the upload URL
          const uploadUrl = await generateUploadUrl();
          
          // Upload the file to storage
          const result = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          });
          
          if (!result.ok) {
            throw new Error(`Failed to upload file ${file.name}`);
          }
          
          // Get the file dimensions to calculate aspect ratio
          const aspectRatio = await getImageAspectRatio(file);
          
          // Generate a title from the filename
          const title = file.name.split('.')[0] || `${defaultTitle} ${index + 1}`;
          
          return {
            title,
            storageId: uploadUrl.split("/").pop()!,
            aspectRatio,
          };
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          return null;
        }
      })
    );
    
    // Filter out failed uploads
    const validPhotos = photoData.filter(Boolean);
    
    if (validPhotos.length === 0) {
      throw new Error("All file uploads failed");
    }
    
    // Save all photos to the database
    const result = await uploadMultiplePhotos({
      albumId,
      userId: user._id,
      photos: validPhotos,
    });
    
    return result;
  };
  
  return {
    generateUploadUrl,
    uploadPhoto: handleUploadPhoto,
    uploadMultiplePhotos: handleUploadMultiplePhotos,
    updatePhoto,
    deletePhoto,
    likePhoto,
    unlikePhoto,
    bookmarkPhoto,
    unbookmarkPhoto,
    addComment,
    deleteComment,
  };
}

/**
 * Custom hook for user profile and social features
 */
export function useUserProfile() {
  const { user } = useCurrentUser();
  
  // Mutations
  const updateUserProfile = useMutation(api.auth.updateUserProfile);
  const followUser = useMutation(api.users.followUser);
  const unfollowUser = useMutation(api.users.unfollowUser);
  
  // Queries
  const isFollowing = (followerId: string, followedId: string) => 
    useQuery(api.users.isFollowing, { followerId, followedId });
  
  const getUserById = (userId: string) => 
    useQuery(api.users.getUserById, { userId });
  
  const getBookmarkedPhotos = () => 
    useQuery(
      api.photos.getBookmarkedPhotos, 
      user ? { userId: user._id } : "skip"
    );
  
  // Actions
  const handleUpdateProfile = async (updates: { 
    name?: string; 
    username?: string; 
    avatar?: string;
  }) => {
    return await updateUserProfile(updates);
  };
  
  const handleFollow = async (followedId: string) => {
    if (!user) return null;
    
    return await followUser({
      followerId: user._id,
      followedId,
    });
  };
  
  const handleUnfollow = async (followedId: string) => {
    if (!user) return null;
    
    return await unfollowUser({
      followerId: user._id,
      followedId,
    });
  };
  
  return {
    updateProfile: handleUpdateProfile,
    follow: handleFollow,
    unfollow: handleUnfollow,
    isFollowing,
    getUserById,
    getBookmarkedPhotos,
  };
}

/**
 * Custom hook for notifications
 */
export function useNotifications() {
  const { user } = useCurrentUser();
  
  // Queries
  const notifications = useQuery(
    api.activities.getUserNotifications, 
    user ? { userId: user._id } : "skip"
  );
  
  const unreadCount = useQuery(
    api.activities.getUnreadNotificationCount,
    user ? { userId: user._id } : "skip"
  );
  
  // Mutations
  const markAsRead = useMutation(api.activities.markNotificationsAsRead);
  const deleteNotifications = useMutation(api.activities.deleteNotifications);
  const clearAllNotifications = useMutation(api.activities.clearAllNotifications);
  
  // Actions
  const handleMarkAsRead = async (activityIds: string[]) => {
    if (!user) return null;
    
    return await markAsRead({
      userId: user._id,
      activityIds,
    });
  };
  
  const handleMarkAllAsRead = async () => {
    if (!user) return null;
    
    return await markAsRead({
      userId: user._id,
      markAll: true,
    });
  };
  
  const handleDeleteNotifications = async (activityIds: string[]) => {
    if (!user) return null;
    
    return await deleteNotifications({
      userId: user._id,
      activityIds,
    });
  };
  
  const handleClearAllNotifications = async () => {
    if (!user) return null;
    
    return await clearAllNotifications({
      userId: user._id,
    });
  };
  
  return {
    notifications,
    unreadCount,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotifications: handleDeleteNotifications,
    clearAllNotifications: handleClearAllNotifications,
  };
}