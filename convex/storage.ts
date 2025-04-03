import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Generate a URL for uploading an image to Convex storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get a URL for downloading a stored file
 */
export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    try {
      return await ctx.storage.getUrl(args.storageId);
    } catch (error) {
      return null;
    }
  },
});

/**
 * Upload a photo to an album
 */
export const uploadPhoto = mutation({
  args: {
    albumId: v.id("albums"),
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    storageId: v.string(),
    aspectRatio: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify the album exists
    const album = await ctx.db.get(args.albumId);
    if (!album) {
      throw new ConvexError("Album not found");
    }

    // Check if the user owns the album
    if (album.userId !== args.userId) {
      throw new ConvexError("You don't have permission to add photos to this album");
    }
    
    // Verify the file exists in storage
    let url;
    try {
      url = await ctx.storage.getUrl(args.storageId);
    } catch (error) {
      throw new ConvexError("File not found in storage");
    }

    if (!url) {
      throw new ConvexError("Failed to get file URL");
    }

    // For a real application, you would want to:
    // 1. Verify that the file is an image
    // 2. Generate thumbnails
    // 3. Optimize the image

    // For now, we'll use the same URL for both full size and thumbnail
    // In a production app, you would use image processing to create thumbnails
    
    // Create the photo
    const photoId = await ctx.db.insert("photos", {
      title: args.title,
      description: args.description,
      albumId: args.albumId,
      userId: args.userId,
      url: url, // In production, this would be the full-size image
      thumbnailUrl: url, // In production, this would be a thumbnail
      storageId: args.storageId,
      aspectRatio: args.aspectRatio,
      dateUploaded: new Date().toISOString(),
      likes: 0,
      comments: 0,
      searchText: `${args.title} ${args.description || ''}`.toLowerCase(),
    });

    // Update the album photo count and last updated date
    await ctx.db.patch(args.albumId, {
      photoCount: (album.photoCount || 0) + 1,
      dateUpdated: new Date().toISOString(),
    });

    // Update the user's total photos count
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.patch(args.userId, {
        totalPhotos: (user.totalPhotos || 0) + 1,
      });
    }

    // If this is the first photo in the album, set it as the cover
    if (album.photoCount === 0 || !album.coverImage) {
      await ctx.db.patch(args.albumId, {
        coverImage: url,
      });
    }

    return { photoId, url };
  },
});

/**
 * Delete a file from storage
 */
export const deleteStoredFile = mutation({
  args: {
    storageId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find photos using this storageId
    const photo = await ctx.db
      .query("photos")
      .filter((q) => q.eq(q.field("storageId"), args.storageId))
      .first();

    // Check if the user has permission to delete this file
    if (photo && photo.userId !== args.userId) {
      throw new ConvexError("You don't have permission to delete this file");
    }

    // Delete the file from storage
    await ctx.storage.delete(args.storageId);
    return args.storageId;
  },
});

/**
 * Upload multiple photos to an album
 */
export const uploadMultiplePhotos = mutation({
  args: {
    albumId: v.id("albums"),
    userId: v.id("users"),
    photos: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        storageId: v.string(),
        aspectRatio: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Verify the album exists
    const album = await ctx.db.get(args.albumId);
    if (!album) {
      throw new ConvexError("Album not found");
    }

    // Check if the user owns the album
    if (album.userId !== args.userId) {
      throw new ConvexError("You don't have permission to add photos to this album");
    }

    const uploadedPhotoIds = [];
    let firstPhotoUrl = null;

    // Process each photo
    for (const photo of args.photos) {
      // Verify the file exists in storage
      let url;
      try {
        url = await ctx.storage.getUrl(photo.storageId);
      } catch (error) {
        // Skip this photo if file not found
        continue;
      }

      if (!url) {
        // Skip this photo if URL couldn't be generated
        continue;
      }

      // Save the URL of the first photo for potential cover image
      if (!firstPhotoUrl) {
        firstPhotoUrl = url;
      }

      // Create the photo
      const photoId = await ctx.db.insert("photos", {
        title: photo.title,
        description: photo.description,
        albumId: args.albumId,
        userId: args.userId,
        url: url,
        thumbnailUrl: url,
        storageId: photo.storageId,
        aspectRatio: photo.aspectRatio,
        dateUploaded: new Date().toISOString(),
        likes: 0,
        comments: 0,
        searchText: `${photo.title} ${photo.description || ''}`.toLowerCase(),
      });

      uploadedPhotoIds.push(photoId);
    }

    // Update the album photo count and last updated date
    await ctx.db.patch(args.albumId, {
      photoCount: (album.photoCount || 0) + uploadedPhotoIds.length,
      dateUpdated: new Date().toISOString(),
    });

    // Update the user's total photos count
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.patch(args.userId, {
        totalPhotos: (user.totalPhotos || 0) + uploadedPhotoIds.length,
      });
    }

    // If this is the first photo in the album, set it as the cover
    if ((album.photoCount === 0 || !album.coverImage) && firstPhotoUrl) {
      await ctx.db.patch(args.albumId, {
        coverImage: firstPhotoUrl,
      });
    }

    return {
      photoIds: uploadedPhotoIds,
      count: uploadedPhotoIds.length,
    };
  },
});

/**
 * Check if a file is valid before uploading
 * This is a client-side helper function to validate images before upload
 */
export const validateImageFile = mutation({
  args: {
    filename: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    // Check file size (limit to 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (args.fileSize > MAX_FILE_SIZE) {
      throw new ConvexError(`File size exceeds the maximum limit (10MB)`);
    }

    // Check if file is an image
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];

    if (!allowedMimeTypes.includes(args.mimeType)) {
      throw new ConvexError(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`
      );
    }

    // Check filename extension
    const extension = args.filename.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
    
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new ConvexError(
        `Invalid file extension. Allowed extensions: ${allowedExtensions.join(", ")}`
      );
    }

    // Return validation success
    return {
      valid: true,
      filename: args.filename,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
    };
  },
});

/**
 * Get a presigned URL for a file upload with validation
 * This is a more advanced version that combines validation + URL generation
 */
export const getPresignedUploadUrl = mutation({
  args: {
    filename: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check file size (limit to 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (args.fileSize > MAX_FILE_SIZE) {
      throw new ConvexError(`File size exceeds the maximum limit (10MB)`);
    }

    // Check if file is an image
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];

    if (!allowedMimeTypes.includes(args.mimeType)) {
      throw new ConvexError(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`
      );
    }

    // Generate a unique filename with user ID prefix for better organization
    const extension = args.filename.split(".").pop()?.toLowerCase();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const sanitizedFilename = `${args.userId}_${timestamp}_${randomString}.${extension}`;

    // Generate the upload URL
    const uploadUrl = await ctx.storage.generateUploadUrl();

    return {
      uploadUrl,
      sanitizedFilename,
    };
  },
});

/**
 * Bulk delete files from storage
 */
export const bulkDeleteStoredFiles = mutation({
  args: {
    storageIds: v.array(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { storageIds, userId } = args;
    
    // Find all photos with these storage IDs
    const photos = await Promise.all(
      storageIds.map(storageId => 
        ctx.db
          .query("photos")
          .filter((q) => q.eq(q.field("storageId"), storageId))
          .first()
      )
    );
    
    // Filter out undefined results
    const validPhotos = photos.filter(Boolean);
    
    // Check permissions for each photo
    for (const photo of validPhotos) {
      if (photo.userId !== userId) {
        throw new ConvexError("You don't have permission to delete some of these files");
      }
    }
    
    // Delete files from storage
    const results = await Promise.allSettled(
      storageIds.map(async (storageId) => {
        try {
          await ctx.storage.delete(storageId);
          return { success: true, storageId };
        } catch (error) {
          return { success: false, storageId, error: error.message };
        }
      })
    );
    
    // Summarize results
    const succeeded = results.filter(r => r.status === "fulfilled" && r.value.success).length;
    const failed = results.filter(r => r.status === "rejected" || !r.value.success).length;
    
    return {
      succeeded,
      failed,
      total: storageIds.length,
    };
  },
});

/**
 * Check user's storage quota
 */
export const checkStorageQuota = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all photos for this user
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
    
    // In a real production app, you would store and track file sizes
    // Here we're just counting the number of photos
    const totalPhotos = photos.length;
    
    // Define quota limits (in a real app, this might be based on user's plan)
    const MAX_FREE_PHOTOS = 100;
    const MAX_PREMIUM_PHOTOS = 1000;
    
    // Get the user to check their plan
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }
    
    // In a real app, you would check the user's plan
    // For now, let's assume all users are on the free plan
    const isPremium = false; // This would be determined by user data
    const photoLimit = isPremium ? MAX_PREMIUM_PHOTOS : MAX_FREE_PHOTOS;
    
    return {
      totalPhotos,
      limit: photoLimit,
      percentUsed: (totalPhotos / photoLimit) * 100,
      remaining: photoLimit - totalPhotos,
      isPremium,
    };
  },
});

/**
 * Move photos between albums
 */
export const movePhotosToAlbum = mutation({
  args: {
    photoIds: v.array(v.id("photos")),
    targetAlbumId: v.id("albums"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { photoIds, targetAlbumId, userId } = args;
    
    // Verify the target album exists
    const targetAlbum = await ctx.db.get(targetAlbumId);
    if (!targetAlbum) {
      throw new ConvexError("Target album not found");
    }
    
    // Verify the user owns the target album
    if (targetAlbum.userId !== userId) {
      throw new ConvexError("You don't have permission to add photos to this album");
    }
    
    // Track source albums that need to be updated
    const sourceAlbumCounts = new Map<string, number>();
    
    // Process each photo
    for (const photoId of photoIds) {
      const photo = await ctx.db.get(photoId);
      if (!photo) continue;
      
      // Verify the user owns the photo
      if (photo.userId !== userId) {
        throw new ConvexError("You don't have permission to move some of these photos");
      }
      
      // Skip photos that are already in the target album
      if (photo.albumId === targetAlbumId) continue;
      
      // Track the source album for later updates
      if (!sourceAlbumCounts.has(photo.albumId)) {
        sourceAlbumCounts.set(photo.albumId, 0);
      }
      sourceAlbumCounts.set(photo.albumId, sourceAlbumCounts.get(photo.albumId)! + 1);
      
      // Move the photo to the target album
      await ctx.db.patch(photoId, {
        albumId: targetAlbumId,
      });
    }
    
    // Update the photo counts for all affected albums
    // First, update the target album
    await ctx.db.patch(targetAlbumId, {
      photoCount: targetAlbum.photoCount + photoIds.length,
      dateUpdated: new Date().toISOString(),
    });
    
    // Then update all source albums
    for (const [albumId, count] of sourceAlbumCounts.entries()) {
      const sourceAlbum = await ctx.db.get(albumId as Id<"albums">);
      if (sourceAlbum) {
        // Update the photo count
        await ctx.db.patch(albumId as Id<"albums">, {
          photoCount: Math.max(0, sourceAlbum.photoCount - count),
          dateUpdated: new Date().toISOString(),
        });
        
        // If this was the last photo and it was the cover image, we need to find a new cover
        if (sourceAlbum.photoCount - count === 0) {
          await ctx.db.patch(albumId as Id<"albums">, {
            coverImage: null,
          });
        } else {
          // Check if any of the moved photos was the album cover
          const photos = await ctx.db
            .query("photos")
            .withIndex("by_album_id", (q) => q.eq("albumId", albumId as Id<"albums">))
            .first();
          
          if (photos && sourceAlbum.coverImage) {
            // If the album cover was one of the moved photos, update it
            const wasCover = photoIds.some(async (photoId) => {
              const photo = await ctx.db.get(photoId);
              return photo && photo.thumbnailUrl === sourceAlbum.coverImage;
            });
            
            if (wasCover) {
              await ctx.db.patch(albumId as Id<"albums">, {
                coverImage: photos.thumbnailUrl,
              });
            }
          }
        }
      }
    }
    
    return {
      movedCount: photoIds.length,
      targetAlbum: targetAlbumId,
    };
  },
});

/**
 * Create a shareable link for photos or albums
 */
export const createShareableLink = mutation({
  args: {
    userId: v.id("users"),
    resourceType: v.string(), // "photo" or "album"
    resourceId: v.union(v.id("photos"), v.id("albums")),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, resourceType, resourceId, expiresInDays } = args;
    
    // Verify the resource exists and user has permission
    if (resourceType === "photo") {
      const photo = await ctx.db.get(resourceId as Id<"photos">);
      if (!photo) {
        throw new ConvexError("Photo not found");
      }
      
      // Check if user owns the photo or if the photo is in a public album
      if (photo.userId !== userId) {
        const album = await ctx.db.get(photo.albumId);
        if (!album || album.isPrivate) {
          throw new ConvexError("You don't have permission to share this photo");
        }
      }
    } else if (resourceType === "album") {
      const album = await ctx.db.get(resourceId as Id<"albums">);
      if (!album) {
        throw new ConvexError("Album not found");
      }
      
      // Check if user owns the album
      if (album.userId !== userId && album.isPrivate) {
        throw new ConvexError("You don't have permission to share this album");
      }
    } else {
      throw new ConvexError("Invalid resource type");
    }
    
    // Generate expiration date if specified
    const expirationDate = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;
    
    // Generate a unique token for the share link
    const shareToken = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    
    // In a real application, you would store the share link in a "shares" table
    // For this example, we're just returning the token
    return {
      shareToken,
      resourceType,
      resourceId,
      expiresAt: expirationDate,
      createdAt: new Date().toISOString(),
    };
  },
});