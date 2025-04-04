import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react';

/**
 * Validates if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Gets an image's aspect ratio
 */
export function getImageAspectRatio(file: File): Promise<number> {
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
}

/**
 * Custom hook to upload files to Convex storage
 */
export function useFileUpload() {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  
  /**
   * Uploads a file to Convex storage
   */
  const uploadFile = async (file: File): Promise<{ storageId: string, url: string }> => {
    if (!file) {
      return Promise.reject(new Error("No file provided"));
    }
    
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      if (!uploadUrl) {
        return Promise.reject(new Error("Failed to generate upload URL"));
      }
      
      // Extract the storage ID from the upload URL
      const storageId = uploadUrl.split("/").pop() || "";
      
      if (!storageId) {
        return Promise.reject(new Error("Failed to extract storage ID from URL"));
      }
      
      return {
        storageId,
        url: uploadUrl,
      };
    } catch (error) {
      return Promise.reject(error);
    }
  };
  
  /**
   * Uploads multiple files to Convex storage
   */
  const uploadMultipleFiles = async (files: File[]): Promise<Array<{ storageId: string, url: string, file: File }>> => {
    if (!files.length) {
      return Promise.reject(new Error("No files provided"));
    }
    
    const uploadPromises = files.map(async (file) => {
      try {
        const result = await uploadFile(file);
        return {
          ...result,
          file
        };
      } catch (error) {
        return null;
      }
    });
    
    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter(Boolean) as Array<{ storageId: string, url: string, file: File }>;
    
    if (successfulUploads.length === 0) {
      return Promise.reject(new Error("All file uploads failed"));
    }
    
    return successfulUploads;
  };
  
  return {
    uploadFile,
    uploadMultipleFiles,
    isUploading: false, // You can add a state to track upload progress if needed
  };
}