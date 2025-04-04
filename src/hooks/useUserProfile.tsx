'use client';

import { useState } from 'react';
import { api } from '@/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';

export function useUserProfile() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Convex mutations
  const updateProfileMutation = useMutation(api.auth.updateUserProfile);
  const followUserMutation = useMutation(api.users.followUser);
  const unfollowUserMutation = useMutation(api.users.unfollowUser);
  
  // Get a user by ID
  const getUserById = (userId: Id<"users">) => 
    useQuery(api.users.getUserById, { userId });
  
  // Check if current user is following another user
  const checkIsFollowing = (followedId: Id<"users">) => {
    const followStatus = useQuery(
      api.users.isFollowing, 
      user ? { followerId: user._id, followedId } : "skip"
    );
    
    return followStatus || false;
  };
  
  // Get user's followers
  const getUserFollowers = (userId: Id<"users">) => 
    useQuery(api.users.getUserFollowers, { userId });
  
  // Get users that a user is following
  const getUserFollowing = (userId: Id<"users">) => 
    useQuery(api.users.getUserFollowing, { userId });
  
  // Update user profile
  const updateProfile = async (updates: { name?: string; username?: string; avatar?: string }) => {
    if (!user) {
      toast.error('You must be logged in to update your profile');
      return false;
    }
    
    try {
      setIsUpdating(true);
      
      await updateProfileMutation(updates);
      
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Follow a user
  const followUser = async (followedId: Id<"users">) => {
    if (!user) {
      toast.error('You must be logged in to follow users');
      return false;
    }
    
    try {
      setIsFollowing(true);
      
      await followUserMutation({
        followerId: user._id,
        followedId
      });
      
      toast.success('User followed');
      return true;
    } catch (error) {
      console.error('Error following user:', error);
      toast.error('Failed to follow user');
      return false;
    } finally {
      setIsFollowing(false);
    }
  };
  
  // Unfollow a user
  const unfollowUser = async (followedId: Id<"users">) => {
    if (!user) {
      toast.error('You must be logged in to unfollow users');
      return false;
    }
    
    try {
      setIsFollowing(true);
      
      await unfollowUserMutation({
        followerId: user._id,
        followedId
      });
      
      toast.success('User unfollowed');
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast.error('Failed to unfollow user');
      return false;
    } finally {
      setIsFollowing(false);
    }
  };

  return {
    getUserById,
    checkIsFollowing,
    getUserFollowers,
    getUserFollowing,
    updateProfile,
    followUser,
    unfollowUser,
    isUpdating,
    isFollowing,
    isLoading: isAuthLoading
  };
}