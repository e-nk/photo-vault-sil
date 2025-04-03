import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

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
  const validateImage = useMutation(api.storage.validateImageFile);
  
  /**
   * Uploads a file to Convex storage
   */
  const uploadFile = async (file: File): Promise<{ storageId: string, url: string }> => {
    if (!file) {
      throw new Error("No file provided");
    }
    
    // Validate the file
    await validateImage({
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
    
    // Get upload URL
    const uploadUrl = await generateUploadUrl();
    
    // Upload the file
    const result = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });
    
    if (!result.ok) {
      throw new Error(`Failed to upload file: ${result.statusText}`);
    }
    
    // Extract the storage ID from the upload URL
    const storageId = uploadUrl.split("/").pop()!;
    
    return {
      storageId,
      url: uploadUrl,
    };
  };
  
  /**
   * Uploads multiple files to Convex storage
   */
  const uploadMultipleFiles = async (files: File[]): Promise<Array<{ storageId: string, url: string, file: File }>> => {
    if (!files.length) {
      throw new Error("No files provided");
    }
    
    const results = await Promise.allSettled(
      files.map(file => uploadFile(file))
    );
    
    // Filter successful uploads and combine with original files
    const successfulUploads = results
      .map((result, index) => {
        if (result.status === 'fulfilled') {
          return {
            ...result.value,
            file: files[index]
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{ storageId: string, url: string, file: File }>;
    
    if (successfulUploads.length === 0) {
      throw new Error("All file uploads failed");
    }
    
    return successfulUploads;
  };
  
  return {
    uploadFile,
    uploadMultipleFiles,
    isUploading: false, // You can add a state to track upload progress if needed
  };
}