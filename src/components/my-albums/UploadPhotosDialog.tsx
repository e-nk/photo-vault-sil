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
import { Upload, X, Image, Check, Loader2 } from 'lucide-react';
import { getImageAspectRatio, isImageFile } from '@/lib/upload';
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
  const getPresignedUploadUrl = useMutation(api.storage.getPresignedUploadUrl);
  const addPhoto = useMutation(api.photos.addPhoto);
  
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
    if (files.length === 0 || !albumId || !user) {
      toast.error("Please select files and try again");
      return;
    }
    
    setUploading(true);
    let successCount = 0;
    
    // Progress tracking setup
    const updateProgress = (current: number, total: number) => {
      const percent = Math.floor((current / total) * 100);
      setUploadProgress(Math.min(percent, 100));
    };
    
    updateProgress(0, files.length);
    
    try {
      // Process each file sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        updateProgress(i, files.length);
        
        try {
          console.log(`Processing file ${i+1}/${files.length}: ${file.name}`);
          
          // Step 1: Get a presigned URL with metadata
          const { uploadUrl, sanitizedFilename } = await getPresignedUploadUrl({
            filename: file.name,
            fileSize: file.size,
            mimeType: file.type,
            userId: user._id
          });
          
          console.log(`Got presigned URL: ${uploadUrl}`);
          console.log(`Sanitized filename: ${sanitizedFilename}`);
          
          // Step 2: Try both POST and FormData approach for upload
          let uploadSuccess = false;
          
          try {
            // First try with FormData and POST
            const formData = new FormData();
            formData.append('file', file);
            
            const postResponse = await fetch(uploadUrl, {
              method: "POST",
              body: formData
            });
            
            if (postResponse.ok) {
              uploadSuccess = true;
              console.log("Upload successful with POST and FormData");
            } else {
              console.log(`POST with FormData failed: ${postResponse.status} ${postResponse.statusText}`);
            }
          } catch (postError) {
            console.error("POST with FormData error:", postError);
          }
          
          // If first method failed, try direct POST
          if (!uploadSuccess) {
            try {
              const directPostResponse = await fetch(uploadUrl, {
                method: "POST",
                body: file
              });
              
              if (directPostResponse.ok) {
                uploadSuccess = true;
                console.log("Upload successful with direct POST");
              } else {
                console.log(`Direct POST failed: ${directPostResponse.status} ${directPostResponse.statusText}`);
              }
            } catch (directPostError) {
              console.error("Direct POST error:", directPostError);
            }
          }
          
          // If both POST methods failed, try PUT
          if (!uploadSuccess) {
            try {
              const putResponse = await fetch(uploadUrl, {
                method: "PUT",
                body: file
              });
              
              if (putResponse.ok) {
                uploadSuccess = true;
                console.log("Upload successful with PUT");
              } else {
                console.log(`PUT failed: ${putResponse.status} ${putResponse.statusText}`);
                throw new Error(`Upload failed: ${putResponse.status} ${putResponse.statusText}`);
              }
            } catch (putError) {
              console.error("PUT error:", putError);
              throw putError;
            }
          }
          
          if (!uploadSuccess) {
            throw new Error("All upload methods failed");
          }
          
          // Step 3: Calculate aspect ratio
          const aspectRatio = await getImageAspectRatio(file);
          
          // Step 4: Wait for the file to be processed
          console.log("Waiting for file to be processed...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Step 5: Register the photo in the database
          console.log("Registering photo in database...");
          await addPhoto({
            albumId,
            userId: user._id,
            title: file.name.split('.')[0] || 'Untitled Photo',
            description: '',
            url: uploadUrl,
            thumbnailUrl: uploadUrl,
            storageId: sanitizedFilename,
            aspectRatio
          });
          
          console.log(`Photo registered in database`);
          successCount++;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}: ${error.message || 'Unknown error'}`);
        }
      }
      
      // Final progress update
      updateProgress(files.length, files.length);
      
      if (successCount > 0) {
        toast.success(`${successCount} photo${successCount !== 1 ? 's' : ''} uploaded successfully`);
        setTimeout(() => {
          onUploadComplete();
          handleClose();
        }, 1000);
      } else {
        toast.error("No photos were uploaded successfully");
        setUploading(false);
      }
    } catch (error) {
      console.error("Upload process error:", error);
      toast.error("Upload process failed");
      setUploading(false);
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
          
          {uploading && (
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Are you sure you want to cancel the upload?")) {
                  setUploading(false);
                }
              }}
              disabled={uploadProgress === 100}
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Cancel Upload
            </Button>
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