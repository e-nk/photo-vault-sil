"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Id } from '@/convex/_generated/dataModel';

interface PhotoViewProps {
  photo: {
    _id: Id<"photos">;
    title: string;
    url: string;
  } | null;
  prevPhoto: { _id: Id<"photos"> } | null;
  nextPhoto: { _id: Id<"photos"> } | null;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  isLoading?: boolean;
}

export function PhotoView({ 
  photo, 
  prevPhoto, 
  nextPhoto, 
  onNavigatePrev, 
  onNavigateNext,
  isLoading = false
}: PhotoViewProps) {
  if (isLoading || !photo) {
    return (
      <div className="flex-1 bg-black flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-white animate-spin opacity-50" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-black flex items-center justify-center relative">
      {/* Previous/Next navigation for larger screens */}
      {prevPhoto && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white absolute left-4 z-10 hidden md:flex"
          onClick={onNavigatePrev}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      
      {nextPhoto && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white absolute right-4 z-10 hidden md:flex"
          onClick={onNavigateNext}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
      )}
      
      {/* Photo */}
      <div className="w-full h-auto max-h-[calc(100vh-16rem)] flex items-center justify-center p-4">
        <img 
          src={photo.url} 
          alt={photo.title} 
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
  );
}