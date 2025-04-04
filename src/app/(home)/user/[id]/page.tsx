"use client";

import React, { useState } from 'react';
import { UserProfileHeader } from '@/components/user/UserProfileHeader';
import { UserAlbumsSection } from '@/components/user/UserAlbumsSection';
import { notFound, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAlbums } from '@/hooks/useAlbums';
import { Loader2 } from 'lucide-react';
import { use } from 'react';

interface UserPageProps {
  params: Promise<{ id: string }>;
}

export default function UserPage({ params }: UserPageProps) {
  // Use React.use to unwrap the params Promise
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { getUserById, checkIsFollowing, followUser, unfollowUser } = useUserProfile();
  const { getUserAlbums } = useAlbums();
  
  // Get profile data
  const profileUser = getUserById(userId);
  const isFollowing = checkIsFollowing(userId);
  const userAlbums = getUserAlbums(userId);
  
  // Follow state
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle follow/unfollow
  const handleToggleFollow = async () => {
    if (!currentUser) {
      router.push('/sign-in');
      return;
    }
    
    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate total photos count across all albums
  const totalPhotos = userAlbums?.albums?.reduce((sum, album) => sum + album.photoCount, 0) || 0;

  // Show loading state
  if (!profileUser) {
    return (
      <div className="min-h-screen bg-photo-primary flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-photo-indigo/50" />
      </div>
    );
  }

  // If user not found
  if (!profileUser) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-photo-primary pb-16">
      {/* User Profile Header */}
      <UserProfileHeader 
        user={profileUser} 
        albumCount={userAlbums?.albums?.length || 0} 
        totalPhotos={totalPhotos}
        isCurrentUser={currentUser?._id === profileUser._id}
        isFollowing={!!isFollowing}
        onToggleFollow={handleToggleFollow}
        isLoading={isLoading}
      />
      
      {/* User Albums Section */}
      <UserAlbumsSection 
        albums={userAlbums?.albums || []}
        isLoading={!userAlbums}
      />
    </div>
  );
}