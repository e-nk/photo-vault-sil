"use client";

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { 
  Calendar, Heart, MessageCircle, Edit, X, Check, ArrowLeft, ArrowRight, 
  Send, Trash2, Loader2, UserRound
} from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';
import { usePhotos } from '@/hooks/usePhotos';
import { cn } from '@/lib/utils';

interface PhotoSidebarProps {
  photo: {
    _id: Id<"photos">;
    title: string;
    description?: string;
    dateUploaded: string;
    likes: number;
    comments: number;
  };
  album: {
    _id: Id<"albums">;
    title: string;
  };
  user: {
    _id: Id<"users">;
    name: string;
    username: string;
    avatar?: string;
  };
  prevPhoto: { _id: Id<"photos"> } | null;
  nextPhoto: { _id: Id<"photos"> } | null;
  isEditing: boolean;
  isOwner: boolean;
  editedTitle: string;
  editedDescription: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onStartEditing: () => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  isSaving?: boolean;
}

export function PhotoSidebar({
  photo,
  album,
  user,
  prevPhoto,
  nextPhoto,
  isEditing,
  isOwner,
  editedTitle,
  editedDescription,
  onTitleChange,
  onDescriptionChange,
  onCancelEdit,
  onSaveEdit,
  onStartEditing,
  onNavigatePrev,
  onNavigateNext,
  isSaving = false
}: PhotoSidebarProps) {
  const formattedDate = formatDistanceToNow(new Date(photo.dateUploaded), { addSuffix: true });
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  // Get photo comments
  const { getPhotoComments, addComment, deleteComment } = usePhotos();
  const commentsResult = getPhotoComments(photo._id);
  
  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmittingComment(true);
    try {
      await addComment(photo._id, newComment);
      setNewComment('');
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  // Handle comment deletion
  const handleDeleteComment = async (commentId: Id<"comments">) => {
    await deleteComment(commentId);
  };

  return (
    <div className="w-full md:w-96 border-l border-photo-border/20 bg-photo-primary flex flex-col">
      {/* User info */}
      <div className="p-6 border-b border-photo-border/20">
        <div className="flex items-center">
          <Link href={`/user/${user._id}`}>
            <Avatar className="h-10 w-10 mr-3 border border-photo-border">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-photo-indigo/20 text-photo-secondary">
                {user?.name?.substring(0, 2).toUpperCase() || <UserRound className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link href={`/user/${user._id}`} className="text-photo-secondary hover:text-photo-indigo transition-colors font-medium">
              {user.name}
            </Link>
            <p className="text-photo-secondary/60 text-xs">@{user.username}</p>
          </div>
          {!isOwner && (
            <Button variant="outline" size="sm" className="ml-auto">
              Follow
            </Button>
          )}
        </div>
      </div>
      
      {/* Photo info */}
      <div className="p-6 flex-1 overflow-y-auto">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-photo-secondary/70 text-xs mb-1">Title</label>
              <Input
                value={editedTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                className="bg-photo-darkgray/30 border-photo-border text-photo-secondary"
              />
            </div>
            
            <div>
              <label className="block text-photo-secondary/70 text-xs mb-1">Description</label>
              <Textarea
                value={editedDescription}
                onChange={(e) => onDescriptionChange(e.target.value)}
                className="bg-photo-darkgray/30 border-photo-border text-photo-secondary min-h-[120px]"
                placeholder="Add a description..."
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={onCancelEdit}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="gap-1 bg-photo-indigo hover:bg-photo-indigo/90"
                onClick={onSaveEdit}
                disabled={!editedTitle.trim() || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-photo-secondary mb-2 break-words">
              {photo.title}
            </h1>
            
            {photo.description && (
              <p className="text-photo-secondary/80 text-sm mt-4 mb-6 break-words">
                {photo.description}
              </p>
            )}
            
            <div className="flex items-center justify-between text-photo-secondary/60 text-sm mt-6">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{formattedDate}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <Heart className="h-4 w-4 mr-1" />
                  <span>{photo.likes}</span>
                </div>
                <div className="flex items-center">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  <span>{photo.comments}</span>
                </div>
              </div>
            </div>
            
            {isOwner && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-6 gap-1"
                onClick={onStartEditing}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit details
              </Button>
            )}
            
            {/* Comments section */}
            <div className="mt-8">
              <h3 className="font-medium text-photo-secondary mb-4">Comments</h3>
              
              {/* Comment form */}
              <div className="flex gap-2 mb-6">
                <Input 
                  placeholder="Add a comment..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-photo-darkgray/30 border-photo-border text-photo-secondary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  className="bg-photo-indigo hover:bg-photo-indigo/90"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                >
                  {isSubmittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Comments list */}
              <div className="space-y-4">
                {commentsResult?.comments?.length === 0 ? (
                  <p className="text-photo-secondary/50 text-sm">No comments yet. Be the first to comment!</p>
                ) : commentsResult?.comments?.map((comment: any) => (
                  <div key={comment._id} className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={comment.user?.avatar} />
                      <AvatarFallback className="bg-photo-indigo/20 text-photo-secondary text-xs">
                        {comment.user?.name?.substring(0, 2).toUpperCase() || <UserRound className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="bg-photo-darkgray/30 p-3 rounded-lg">
                        <div className="flex justify-between">
                          <Link 
                            href={`/user/${comment.user?._id}`} 
                            className="font-medium text-photo-secondary text-sm hover:text-photo-indigo transition-colors"
                          >
                            {comment.user?.name || "User"}
                          </Link>
                          <span className="text-photo-secondary/40 text-xs">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-photo-secondary/80 text-sm mt-1 break-words">
                          {comment.content}
                        </p>
                      </div>
                      
                      {/* Comment actions */}
                      <div className="flex gap-4 mt-1 ml-1">
                        <button className="text-photo-secondary/50 text-xs hover:text-photo-secondary transition-colors">
                          Like
                        </button>
                        <button className="text-photo-secondary/50 text-xs hover:text-photo-secondary transition-colors">
                          Reply
                        </button>
                        {(isOwner || comment.user?._id === user._id) && (
                          <button 
                            className="text-photo-secondary/50 text-xs hover:text-red-500 transition-colors"
                            onClick={() => handleDeleteComment(comment._id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {commentsResult?.nextCursor && (
                  <Button variant="ghost" size="sm" className="w-full text-photo-secondary/60">
                    Load more comments
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Album info */}
      <div className="p-6 border-t border-photo-border/20">
        <p className="text-photo-secondary/70 text-xs mb-2">From the album</p>
        <Link href={`/album/${album._id}`} className="text-photo-secondary hover:text-photo-indigo transition-colors">
          {album.title}
        </Link>
        
        {/* Mobile navigation */}
        <div className="flex items-center justify-between mt-4 md:hidden">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1"
            disabled={!prevPhoto}
            onClick={onNavigatePrev}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1"
            disabled={!nextPhoto}
            onClick={onNavigateNext}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
	);
}