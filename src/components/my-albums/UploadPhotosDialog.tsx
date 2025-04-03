"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, X, Image, Check } from 'lucide-react';
import { useFileUpload, getImageAspectRatio, isImageFile } from '@/lib/upload';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';

interface UploadPhotosDialogProps {
  isOpen: boolean;
  onClose: () => void;
  albumId: Id<"albums"> | null;
  onUploadComplete: () => void;
}

export function UploadPhotosDialog({
  isOpen,
  onClose,
  albumId,
  onUploadComplete
}: UploadPhotosDialogProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Convex mutations
  const uploadMultiplePhotosMutation = useMutation(api.storage.uploadMultiplePhotos);
  const { uploadFile } = useFileUpload();
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFiles = Array.from(event.target.files);
      
      // Filter out non-image files
      const imageFiles = selectedFiles.filter(file => isImageFile(file));
      
      if (imageFiles.length !== selectedFiles.length) {
        toast.warning(`${selectedFiles.length - imageFiles.length} non-image files were excluded.`);
      }
      
      setFiles(prevFiles => [...prevFiles, ...imageFiles]);
    }
  };
  
  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  
  const handleUpload = async () => {
    if (files.length === 0 || !albumId || !user) return;
    
    try {
      setUploading(true);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 300);
      
      // Prepare the photo data
      const photoDataPromises = files.map(async (file) => {
        try {
          // Upload file to storage
          const { storageId } = await uploadFile(file);
          
          // Get aspect ratio
          const aspectRatio = await getImageAspectRatio(file);
          
          // Generate title from filename
          const title = file.name.split('.')[0] || 'Untitled Photo';
          
          return {
            title,
            storageId,
            aspectRatio,
          };
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          return null;
        }
      });
      
      const photoData = (await Promise.all(photoDataPromises)).filter(Boolean);
      
      if (photoData.length === 0) {
        throw new Error("All file uploads failed");
      }
      
      // Upload photos to the album
      await uploadMultiplePhotosMutation({
        albumId,
        userId: user._id,
        photos: photoData,
      });
      
      // Complete progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Success notification
      toast.success(`${photoData.length} photos uploaded successfully`);
      
      // Wait a moment before closing
      setTimeout(() => {
        onUploadComplete();
        handleClose();
      }, 1000);
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast.error("Failed to upload photos. Please try again.");
      setUploading(false);
      setUploadProgress(0);
    }
  };
  
  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setUploading(false);
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-photo-primary border-photo-border text-photo-secondary">
        <DialogHeader>
          <DialogTitle>Upload Photos to Album</DialogTitle>
          <DialogDescription className="text-photo-secondary/70">
            Add new photos to your album. You can select multiple files at once.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {/* Upload area */}
          {!uploading && (
            <div className="border-2 border-dashed border-photo-border/50 rounded-lg p-8 text-center">
              <input
                type="file"
                id="photo-upload"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-10 w-10 text-photo-secondary/50 mb-4" />
                <p className="text-photo-secondary font-medium">Drag photos here or click to browse</p>
                <p className="text-photo-secondary/60 text-sm mt-1">
                  Supports JPG, PNG, WebP formats
                </p>
              </label>
            </div>
          )}
          
          {/* Upload progress */}
          {uploading && (
            <div className="text-center py-4">
              <div className="w-full bg-photo-darkgray/30 rounded-full h-4 mb-4">
                <div
                  className="bg-photo-indigo h-4 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-photo-secondary">
                Uploading {files.length} photo{files.length !== 1 ? 's' : ''}...
              </p>
              <p className="text-photo-secondary/60 text-sm">
                {uploadProgress}% complete
              </p>
            </div>
          )}
          
          {/* Selected files */}
          {!uploading && files.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-photo-secondary font-medium">
                  {files.length} photo{files.length !== 1 ? 's' : ''} selected
                </h4>
                <Button
                  variant="ghost"
                  className="text-xs text-photo-secondary/60 h-7"
                  onClick={() => setFiles([])}
                >
                  Clear all
                </Button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="relative border border-photo-border/30 rounded-md p-2 flex items-center"
                  >
                    <div className="h-8 w-8 bg-photo-darkgray/40 rounded flex items-center justify-center mr-2">
                      <Image className="h-4 w-4 text-photo-secondary/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-photo-secondary text-xs truncate">
                        {file.name}
                      </p>
                      <p className="text-photo-secondary/60 text-xs">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {!uploading && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                className="bg-photo-indigo hover:bg-photo-indigo/90"
                onClick={handleUpload}
                disabled={files.length === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload {files.length > 0 ? `${files.length} Photo${files.length !== 1 ? 's' : ''}` : ''}
              </Button>
            </>
          )}
          
          {uploading && uploadProgress === 100 && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleClose}
            >
              <Check className="h-4 w-4 mr-2" />
              Upload Complete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}