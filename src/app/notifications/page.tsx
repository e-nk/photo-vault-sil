'use client';

import React, { useEffect } from 'react';
import Container from '@/components/common/Container';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/lib/convex';
import { formatDistanceToNow } from 'date-fns';
import { Check, Loader2, Trash, UserPlus, Heart, MessageSquare, Bookmark, Image } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AuthCheck from '@/components/auth/AuthCheck';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const { 
    notifications, 
    unreadCount, 
    markAllAsRead, 
    clearAllNotifications 
  } = useNotifications();

  // Mark all as read on page visit
  useEffect(() => {
    if (unreadCount && unreadCount > 0) {
      markAllAsRead();
    }
  }, [unreadCount, markAllAsRead]);

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      toast.success('Notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-rose-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'bookmark':
        return <Bookmark className="h-4 w-4 text-purple-500" />;
      default:
        return <Image className="h-4 w-4 text-photo-indigo" />;
    }
  };

  // Get activity description based on type
  const getActivityDescription = (activity: any) => {
    const userName = activity.actionUser?.name || 'Someone';
    
    switch (activity.type) {
      case 'like':
        return (
          <span>
            <span className="font-medium">{userName}</span> liked your photo
            {activity.photo && (
              <Link href={`/photo/${activity.photo._id}`} className="text-photo-indigo hover:underline ml-1">
                "{activity.photo.title}"
              </Link>
            )}
          </span>
        );
      case 'comment':
        return (
          <span>
            <span className="font-medium">{userName}</span> commented on your photo
            {activity.photo && (
              <Link href={`/photo/${activity.photo._id}`} className="text-photo-indigo hover:underline ml-1">
                "{activity.photo.title}"
              </Link>
            )}
            {activity.comment && (
              <span className="italic ml-1">: "{activity.comment.content.substring(0, 50)}{activity.comment.content.length > 50 ? '...' : ''}"</span>
            )}
          </span>
        );
      case 'follow':
        return (
          <span>
            <span className="font-medium">{userName}</span> started following you
          </span>
        );
      case 'bookmark':
        return (
          <span>
            <span className="font-medium">{userName}</span> bookmarked your photo
            {activity.photo && (
              <Link href={`/photo/${activity.photo._id}`} className="text-photo-indigo hover:underline ml-1">
                "{activity.photo.title}"
              </Link>
            )}
          </span>
        );
      case 'album_comment':
        return (
          <span>
            <span className="font-medium">{userName}</span> commented on your album
            {activity.album && (
              <Link href={`/album/${activity.album._id}`} className="text-photo-indigo hover:underline ml-1">
                "{activity.album.title}"
              </Link>
            )}
          </span>
        );
      default:
        return <span><span className="font-medium">{userName}</span> interacted with your content</span>;
    }
  };

  // Generate URL for activity
  const getActivityUrl = (activity: any) => {
    if (activity.photo) {
      return `/photo/${activity.photo._id}`;
    }
    if (activity.album) {
      return `/album/${activity.album._id}`;
    }
    if (activity.type === 'follow' && activity.actionUser) {
      return `/user/${activity.actionUser._id}`;
    }
    return '#';
  };

  return (
    <AuthCheck>
      <div className="min-h-screen bg-photo-primary pb-16">
        <div className="py-8 border-b border-photo-border/20">
          <Container>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-photo-secondary">Notifications</h1>
                <p className="text-photo-secondary/70 mt-2">
                  Stay updated on interactions with your content
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleClearAll}
                disabled={!notifications?.activities?.length}
              >
                <Trash className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </Container>
        </div>
        
        <Container className="mt-8">
          {!notifications ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-photo-indigo" />
            </div>
          ) : notifications.activities?.length === 0 ? (
            <div className="bg-photo-darkgray/20 border border-photo-border/20 rounded-lg p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-photo-darkgray/30 flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-photo-secondary/40" />
              </div>
              <h3 className="text-xl font-medium text-photo-secondary mb-2">All caught up!</h3>
              <p className="text-photo-secondary/60 max-w-md mx-auto">
                You don't have any notifications at the moment. Check back later for updates on your photos and interactions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.activities.map((activity: any) => (
                <Link 
                  href={getActivityUrl(activity)}
                  key={activity._id}
                  className="flex items-start gap-4 p-4 bg-photo-darkgray/20 border border-photo-border/20 rounded-lg hover:bg-photo-darkgray/30 transition-colors"
                >
                  <Avatar className="h-10 w-10 border border-photo-border/30 flex-shrink-0">
                    <AvatarImage src={activity.actionUser?.avatar} />
                    <AvatarFallback className="bg-photo-indigo/20 text-photo-secondary">
                      {activity.actionUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-5 w-5 rounded-full bg-photo-darkgray/30 flex items-center justify-center">
                        {getActivityIcon(activity.type)}
                      </div>
                      <p className="text-photo-secondary/70 text-sm">
                        {getActivityDescription(activity)}
                      </p>
                    </div>
                    
                    <p className="text-photo-secondary/50 text-xs">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  
                  {!activity.read && (
                    <div className="w-2 h-2 rounded-full bg-photo-indigo flex-shrink-0 mt-2"></div>
                  )}
                </Link>
              ))}
              
              {notifications.nextCursor && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline">
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </Container>
      </div>
    </AuthCheck>
  );
}