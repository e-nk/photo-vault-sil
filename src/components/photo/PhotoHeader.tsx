"use client";

import React, { useState } from 'react';
import { 
  ArrowLeft, Heart, Bookmark, Share2, MoreHorizontal, Download, Edit, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { usePhotos } from '@/hooks/usePhotos';
import { Id } from '@/convex/_generated/dataModel';
import { cn } from '@/lib/utils';

interface PhotoHeaderProps {
  photo: {
    _id: Id<"photos">;
    title: string;
  };
  album: {
    _id: Id<"albums">;
    title: string;
  };
  isLiked: boolean;
  isSaved: boolean;
  isOwner: boolean;
  isEditing: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onStartEditing: () => void;
  isLikeLoading?: boolean;
  isSaveLoading?: boolean;
}

export function PhotoHeader({ 
  photo, 
  album, 
  isLiked,
  isSaved,
  isOwner,
  isEditing,
  onToggleLike,
  onToggleSave,
  onStartEditing,
  isLikeLoading = false,
  isSaveLoading = false
}: PhotoHeaderProps) {
  // Share URL state
  const [isSharing, setIsSharing] = useState(false);
  
  // Share photo URL
  const handleShare = async () => {
    setIsSharing(true);
    try {
      const url = window.location.href;
      
      if (navigator.share) {
        await navigator.share({
          title: photo.title,
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        // Toast notification handled by parent
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="border-b border-photo-border/20 bg-photo-primary/80 backdrop-blur-md sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link 
            href={`/album/${album._id}`}
            className="text-photo-secondary/70 hover:text-photo-secondary flex items-center transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to album
          </Link>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={isLiked ? "default" : "ghost"} 
            size="sm" 
            className={cn(
              isLiked ? "bg-rose-500 hover:bg-rose-600" : "",
              "transition-colors"
            )}
            onClick={onToggleLike}
            disabled={isLikeLoading}
          >
            {isLikeLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Heart className={cn("h-4 w-4 mr-1", isLiked && "fill-current")} />
            )}
            {isLiked ? "Liked" : "Like"}
          </Button>
          
          <Button 
            variant={isSaved ? "default" : "ghost"} 
            size="sm"
            className={cn(
              isSaved ? "bg-photo-indigo hover:bg-photo-indigo/90" : "",
              "transition-colors"
            )}
            onClick={onToggleSave}
            disabled={isSaveLoading}
          >
            {isSaveLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Bookmark className={cn("h-4 w-4 mr-1", isSaved && "fill-current")} />
            )}
            {isSaved ? "Saved" : "Save"}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleShare}
            disabled={isSharing}
          >
            {isSharing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4 mr-1" />
            )}
            Share
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.open(photo.title, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              {isOwner && !isEditing && (
                <DropdownMenuItem onClick={onStartEditing}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit details
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500">
                Report content
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}