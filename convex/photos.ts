import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Add a new photo to an album
 */
export const addPhoto = mutation({
  args: {
    albumId: v.id("albums"),
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    url: v.string(),
    thumbnailUrl: v.string(),
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

    // Create the photo
    const photoId = await ctx.db.insert("photos", {
      title: args.title,
      description: args.description,
      albumId: args.albumId,
      userId: args.userId,
      url: args.url,
      thumbnailUrl: args.thumbnailUrl,
      storageId: args.storageId,
      aspectRatio: args.aspectRatio,
      dateUploaded: new Date().toISOString(),
      likes: 0,
      comments: 0,
      searchText: `${args.title} ${args.description || ''}`.toLowerCase(),
    });

    // Update the album photo count
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
    if (album.photoCount === 0 && !album.coverImage) {
      await ctx.db.patch(args.albumId, {
        coverImage: args.thumbnailUrl,
      });
    }

    return photoId;
  },
});

/**
 * Update a photo's details
 */
export const updatePhoto = mutation({
  args: {
    photoId: v.id("photos"),
    userId: v.id("users"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the photo exists
    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      throw new ConvexError("Photo not found");
    }

    // Check ownership
    if (photo.userId !== args.userId) {
      throw new ConvexError("You don't have permission to update this photo");
    }

    // Create updates object
    const updates: any = {};

    if (args.title !== undefined) {
      updates.title = args.title;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    // Update search text if title or description changed
    if (args.title !== undefined || args.description !== undefined) {
      updates.searchText = `${args.title || photo.title} ${args.description || photo.description || ''}`.toLowerCase();
    }

    // Update the photo
    await ctx.db.patch(args.photoId, updates);

    return args.photoId;
  },
});

/**
 * Delete a photo
 */
export const deletePhoto = mutation({
  args: {
    photoId: v.id("photos"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the photo exists
    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      throw new ConvexError("Photo not found");
    }

    // Check ownership
    if (photo.userId !== args.userId) {
      throw new ConvexError("You don't have permission to delete this photo");
    }

    // Get the album
    const album = await ctx.db.get(photo.albumId);
    if (!album) {
      throw new ConvexError("Album not found");
    }

    // Delete the photo
    await ctx.db.delete(args.photoId);

    // Update the album photo count
    await ctx.db.patch(photo.albumId, {
      photoCount: Math.max(0, (album.photoCount || 0) - 1),
      dateUpdated: new Date().toISOString(),
    });

    // Update the user's total photos count
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.patch(args.userId, {
        totalPhotos: Math.max(0, (user.totalPhotos || 0) - 1),
      });
    }

    // If this was the album cover, update the album cover
    if (album.coverImage === photo.thumbnailUrl) {
      // Find another photo to use as cover
      const anotherPhoto = await ctx.db
        .query("photos")
        .withIndex("by_album_id", (q) => q.eq("albumId", photo.albumId))
        .first();

      await ctx.db.patch(photo.albumId, {
        coverImage: anotherPhoto ? anotherPhoto.thumbnailUrl : null,
      });
    }

    // Delete all likes, comments, and bookmarks for this photo
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_photo_id", (q) => q.eq("photoId", args.photoId))
      .collect();

    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_photo_id", (q) => q.eq("photoId", args.photoId))
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_photo_id", (q) => q.eq("photoId", args.photoId))
      .collect();

    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
    }

    return args.photoId;
  },
});

/**
 * Get a photo by ID
 */
export const getPhotoById = query({
  args: {
    photoId: v.id("photos"),
    requestingUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      return null;
    }

    // Check album privacy
    const album = await ctx.db.get(photo.albumId);
    if (!album) {
      return null;
    }

    // If the album is private, check if the requesting user is the owner
    if (album.isPrivate && album.userId !== args.requestingUserId) {
      return null;
    }

    // Get user details
    const user = await ctx.db.get(photo.userId);

    // Check if the user has liked this photo
    let isLiked = false;
    if (args.requestingUserId) {
      const like = await ctx.db
        .query("likes")
        .withIndex("by_photo_and_user", (q) => 
          q.eq("photoId", args.photoId).eq("userId", args.requestingUserId)
        )
        .first();
      isLiked = !!like;
    }

    // Check if the user has bookmarked this photo
    let isBookmarked = false;
    if (args.requestingUserId) {
      const bookmark = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_and_photo", (q) => 
          q.eq("userId", args.requestingUserId).eq("photoId", args.photoId)
        )
        .first();
      isBookmarked = !!bookmark;
    }

    return {
      photo,
      album,
      user,
      isLiked,
      isBookmarked,
    };
  },
});

/**
 * Get photos by album ID
 */
export const getPhotosByAlbumId = query({
  args: {
    albumId: v.id("albums"),
    requestingUserId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("photos")),
    searchTerm: v.optional(v.string()),
    sortBy: v.optional(v.string()), // 'newest', 'oldest', 'most-liked', etc.
  },
  handler: async (ctx, args) => {
    // Verify the album exists and check privacy
    const album = await ctx.db.get(args.albumId);
    if (!album) {
      return { photos: [], nextCursor: null };
    }

    // If the album is private, check if the requesting user is the owner
    if (album.isPrivate && album.userId !== args.requestingUserId) {
      return { photos: [], nextCursor: null };
    }

    const limit = args.limit ?? 20;
    let query = ctx.db
      .query("photos")
      .withIndex("by_album_id", (q) => q.eq("albumId", args.albumId));

    // Apply search filter if provided
    if (args.searchTerm && args.searchTerm.trim() !== "") {
      const searchText = args.searchTerm.toLowerCase();
      query = query.filter((q) => 
        q.search("searchText", searchText)
      );
    }

    // Apply cursor pagination if provided
    if (args.cursor) {
      query = query.withCursor(args.cursor);
    }

    // Apply sorting
    if (args.sortBy) {
      switch (args.sortBy) {
        case "newest":
          query = query.order("desc", "dateUploaded");
          break;
        case "oldest":
          query = query.order("asc", "dateUploaded");
          break;
        case "most-liked":
          query = query.order("desc", "likes");
          break;
        case "title-az":
          query = query.order("asc", "title");
          break;
        case "title-za":
          query = query.order("desc", "title");
          break;
        default:
          query = query.order("desc", "dateUploaded");
      }
    } else {
      // Default sort: most recent first
      query = query.order("desc", "dateUploaded");
    }

    const photos = await query.take(limit);

    // If the requesting user is provided, check which photos they've liked/bookmarked
    let likedPhotoIds = new Set<string>();
    let bookmarkedPhotoIds = new Set<string>();

    if (args.requestingUserId) {
      // Get likes
      const likes = await ctx.db
        .query("likes")
        .withIndex("by_user_id", (q) => q.eq("userId", args.requestingUserId))
        .collect();

      likedPhotoIds = new Set(likes.map(like => like.photoId));

      // Get bookmarks
      const bookmarks = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_id", (q) => q.eq("userId", args.requestingUserId))
        .collect();

      bookmarkedPhotoIds = new Set(bookmarks.map(bookmark => bookmark.photoId));
    }

    // Enhance photos with the liked/bookmarked status
    const enhancedPhotos = photos.map(photo => ({
      ...photo,
      isLiked: likedPhotoIds.has(photo._id),
      isBookmarked: bookmarkedPhotoIds.has(photo._id)
    }));

    return {
      photos: enhancedPhotos,
      nextCursor: photos.length === limit ? photos[photos.length - 1]._id : null,
    };
  },
});

/**
 * Get photos by user ID
 */
export const getPhotosByUserId = query({
  args: {
    userId: v.id("users"),
    requestingUserId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("photos")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    let query = ctx.db
      .query("photos")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId));

    // Apply cursor pagination if provided
    if (args.cursor) {
      query = query.withCursor(args.cursor);
    }

    // Default sort: most recent first
    query = query.order("desc", "dateUploaded");

    // Get the photos
    const photos = await query.take(limit);

    // Filter out photos from private albums if not the owner
    if (args.userId !== args.requestingUserId) {
      const albumIds = [...new Set(photos.map(photo => photo.albumId))];
      const albums = await Promise.all(
        albumIds.map(id => ctx.db.get(id))
      );

      // Create a map of albumId -> isPrivate
      const albumPrivacy = new Map<string, boolean>();
      albums.forEach(album => {
        if (album) {
          albumPrivacy.set(album._id, album.isPrivate);
        }
      });

      // Filter out photos from private albums
      const filteredPhotos = photos.filter(photo => 
        !albumPrivacy.get(photo.albumId)
      );

      return {
        photos: filteredPhotos,
        nextCursor: photos.length === limit ? photos[photos.length - 1]._id : null,
      };
    }

    return {
      photos,
      nextCursor: photos.length === limit ? photos[photos.length - 1]._id : null,
    };
  },
});

/**
 * Like a photo
 */
export const likePhoto = mutation({
  args: {
    photoId: v.id("photos"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the photo exists
    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      throw new ConvexError("Photo not found");
    }

    // Check if already liked
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_photo_and_user", (q) => 
        q.eq("photoId", args.photoId).eq("userId", args.userId)
      )
      .first();

    if (existingLike) {
      return existingLike._id;
    }

    // Create the like
    const likeId = await ctx.db.insert("likes", {
      photoId: args.photoId,
      userId: args.userId,
      createdAt: new Date().toISOString(),
    });

    // Update the photo's like count
    await ctx.db.patch(args.photoId, {
      likes: (photo.likes || 0) + 1,
    });

    // Add an activity for the photo owner
    if (photo.userId !== args.userId) {
      await ctx.db.insert("activities", {
        userId: args.userId,
        targetUserId: photo.userId,
        type: "like",
        photoId: args.photoId,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    return likeId;
  },
});

/**
 * Unlike a photo
 */
export const unlikePhoto = mutation({
  args: {
    photoId: v.id("photos"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the photo exists
    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      throw new ConvexError("Photo not found");
    }

    // Find the like
    const like = await ctx.db
      .query("likes")
      .withIndex("by_photo_and_user", (q) => 
        q.eq("photoId", args.photoId).eq("userId", args.userId)
      )
      .first();

    if (!like) {
      throw new ConvexError("Like not found");
    }

    // Delete the like
    await ctx.db.delete(like._id);

    // Update the photo's like count
    await ctx.db.patch(args.photoId, {
      likes: Math.max(0, (photo.likes || 0) - 1),
    });

    return like._id;
  },
});

/**
 * Bookmark a photo
 */
export const bookmarkPhoto = mutation({
  args: {
    photoId: v.id("photos"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the photo exists
    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      throw new ConvexError("Photo not found");
    }

    // Check if already bookmarked
    const existingBookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_photo", (q) => 
        q.eq("userId", args.userId).eq("photoId", args.photoId)
      )
      .first();

    if (existingBookmark) {
      return existingBookmark._id;
    }

    // Create the bookmark
    const bookmarkId = await ctx.db.insert("bookmarks", {
      photoId: args.photoId,
      userId: args.userId,
      createdAt: new Date().toISOString(),
    });

    // Add an activity for the photo owner
    if (photo.userId !== args.userId) {
      await ctx.db.insert("activities", {
        userId: args.userId,
        targetUserId: photo.userId,
        type: "bookmark",
        photoId: args.photoId,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    return bookmarkId;
  },
});

/**
 * Remove a bookmark
 */
export const unbookmarkPhoto = mutation({
  args: {
    photoId: v.id("photos"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find the bookmark
    const bookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_photo", (q) => 
        q.eq("userId", args.userId).eq("photoId", args.photoId)
      )
      .first();

    if (!bookmark) {
      throw new ConvexError("Bookmark not found");
    }

    // Delete the bookmark
    await ctx.db.delete(bookmark._id);

    return bookmark._id;
  },
});

/**
 * Add a comment to a photo
 */
export const addComment = mutation({
  args: {
    photoId: v.id("photos"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify the photo exists
    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      throw new ConvexError("Photo not found");
    }

    // Create the comment
    const commentId = await ctx.db.insert("comments", {
      photoId: args.photoId,
      userId: args.userId,
      content: args.content,
      createdAt: new Date().toISOString(),
    });

    // Update the photo's comment count
    await ctx.db.patch(args.photoId, {
      comments: (photo.comments || 0) + 1,
    });

    // Add an activity for the photo owner
    if (photo.userId !== args.userId) {
      await ctx.db.insert("activities", {
        userId: args.userId,
        targetUserId: photo.userId,
        type: "comment",
        photoId: args.photoId,
        commentId: commentId,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    return commentId;
  },
});

/**
 * Delete a comment
 */
export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the comment exists
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new ConvexError("Comment not found");
    }

    // Check ownership
    if (comment.userId !== args.userId) {
      // Check if the user is the photo owner
      const photo = await ctx.db.get(comment.photoId);
      if (!photo || photo.userId !== args.userId) {
        throw new ConvexError("You don't have permission to delete this comment");
      }
    }

    // Delete the comment
    await ctx.db.delete(args.commentId);

    // Update the photo's comment count
    const photo = await ctx.db.get(comment.photoId);
    if (photo) {
      await ctx.db.patch(comment.photoId, {
        comments: Math.max(0, (photo.comments || 0) - 1),
      });
    }

    return args.commentId;
  },
});

/**
 * Get comments for a photo
 */
export const getCommentsByPhotoId = query({
  args: {
    photoId: v.id("photos"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    let query = ctx.db
      .query("comments")
      .withIndex("by_photo_id", (q) => q.eq("photoId", args.photoId));

    // Apply cursor pagination if provided
    if (args.cursor) {
      query = query.withCursor(args.cursor);
    }

    // Order by creation date, newest first
    query = query.order("desc", "createdAt");

    const comments = await query.take(limit);

    // Fetch user details for each comment
    const commentUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          ...comment,
          user,
        };
      })
    );

    return {
      comments: commentUsers,
      nextCursor: comments.length === limit ? comments[comments.length - 1]._id : null,
    };
  },
});

/**
 * Get bookmarked photos for a user
 */
export const getBookmarkedPhotos = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("bookmarks")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    let query = ctx.db
      .query("bookmarks")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId));

    // Apply cursor pagination if provided
    if (args.cursor) {
      query = query.withCursor(args.cursor);
    }

    // Order by creation date, newest first
    query = query.order("desc", "createdAt");

    const bookmarks = await query.take(limit);

    // Fetch photo details for each bookmark
    const photos = await Promise.all(
      bookmarks.map(async (bookmark) => {
        const photo = await ctx.db.get(bookmark.photoId);
        if (!photo) return null;

        // Check album privacy
        const album = await ctx.db.get(photo.albumId);
        if (!album) return null;

        // Skip photos from private albums that don't belong to the user
        if (album.isPrivate && album.userId !== args.userId) {
          return null;
        }

        const user = await ctx.db.get(photo.userId);
        
        return {
          ...photo,
          bookmarkedAt: bookmark.createdAt,
          user,
          album,
        };
      })
    );

    // Filter out null values (deleted photos or private albums)
    const validPhotos = photos.filter(Boolean);

    return {
      photos: validPhotos,
      nextCursor: bookmarks.length === limit ? bookmarks[bookmarks.length - 1]._id : null,
    };
  },
});

// Add these functions to the photos.ts file

/**
 * Get photos for exploration
 */
export const getExplorePhotos = query({
  args: {
    sortBy: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("photos")),
    requestingUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    let query = ctx.db.query("photos");

    // Apply privacy filtering - only show photos from public albums
    // unless requesting own photos
    if (args.requestingUserId) {
      query = query.filter((q) => {
        return q.or(
          // Show photos from public albums
          q.eq(
            // Get albums.isPrivate value via a join
            q.field(
              q.join(q.field("albumId"), 
                ctx.db.query("albums")
              ),
              "isPrivate"
            ),
            false
          ),
          // Or show own photos
          q.eq(q.field("userId"), args.requestingUserId)
        );
      });
    } else {
      // If no requesting user, only show photos from public albums
      query = query.filter((q) => {
        return q.eq(
          q.field(
            q.join(q.field("albumId"), 
              ctx.db.query("albums")
            ),
            "isPrivate"
          ),
          false
        );
      });
    }

    // Apply sorting
    if (args.sortBy) {
      switch (args.sortBy) {
        case 'newest':
          query = query.order("desc", "dateUploaded");
          break;
        case 'oldest':
          query = query.order("asc", "dateUploaded");
          break;
        case 'most-liked':
          query = query.order("desc", "likes");
          break;
        case 'trending':
          // For trending, we'll use a mix of recency and likes
          // In a real app, you'd have a more sophisticated algorithm
          query = query.order("desc", "likes");
          break;
        default:
          query = query.order("desc", "dateUploaded");
      }
    } else {
      // Default sort: most recent first
      query = query.order("desc", "dateUploaded");
    }

    // Apply cursor if provided
    if (args.cursor) {
      query = query.withCursor(args.cursor);
    }

    const photos = await query.take(limit);

    // If requesting user is provided, check which photos they've liked/bookmarked
    let likedPhotoIds = new Set<string>();
    let bookmarkedPhotoIds = new Set<string>();

    if (args.requestingUserId) {
      // Get likes
      const likes = await ctx.db
        .query("likes")
        .withIndex("by_user_id", (q) => q.eq("userId", args.requestingUserId))
        .collect();

      likedPhotoIds = new Set(likes.map(like => like.photoId));

      // Get bookmarks
      const bookmarks = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_id", (q) => q.eq("userId", args.requestingUserId))
        .collect();

      bookmarkedPhotoIds = new Set(bookmarks.map(bookmark => bookmark.photoId));
    }

    // Get user and album data for each photo
    const photosWithData = await Promise.all(
      photos.map(async (photo) => {
        const album = await ctx.db.get(photo.albumId);
        const user = await ctx.db.get(photo.userId);
        
        return {
          ...photo,
          isLiked: likedPhotoIds.has(photo._id),
          isBookmarked: bookmarkedPhotoIds.has(photo._id),
          user: user ? { 
            _id: user._id,
            name: user.name,
            username: user.username,
            avatar: user.avatar 
          } : null,
          album: album ? {
            _id: album._id,
            title: album.title,
            isPrivate: album.isPrivate
          } : null
        };
      })
    );

    return {
      photos: photosWithData,
      nextCursor: photos.length === limit ? photos[photos.length - 1]._id : null,
    };
  },
});

/**
 * Search for photos
 */
export const searchPhotos = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("photos")),
    requestingUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!args.searchTerm || args.searchTerm.trim() === "") {
      return { photos: [], nextCursor: null };
    }

    const limit = args.limit ?? 20;
    let query = ctx.db
      .query("photos")
      .withSearchIndex("by_search", (q) => 
        q.search("searchText", args.searchTerm.toLowerCase())
      );

    // Apply privacy filtering - only show photos from public albums
    // unless requesting own photos
    if (args.requestingUserId) {
      query = query.filter((q) => {
        return q.or(
          // Show photos from public albums
          q.eq(
            // Get albums.isPrivate value via a join
            q.field(
              q.join(q.field("albumId"), 
                ctx.db.query("albums")
              ),
              "isPrivate"
            ),
            false
          ),
          // Or show own photos
          q.eq(q.field("userId"), args.requestingUserId)
        );
      });
    } else {
      // If no requesting user, only show photos from public albums
      query = query.filter((q) => {
        return q.eq(
          q.field(
            q.join(q.field("albumId"), 
              ctx.db.query("albums")
            ),
            "isPrivate"
          ),
          false
        );
      });
    }

    // Apply cursor if provided
    if (args.cursor) {
      query = query.withCursor(args.cursor);
    }

    const photos = await query.take(limit);

    // If requesting user is provided, check which photos they've liked/bookmarked
    let likedPhotoIds = new Set<string>();
    let bookmarkedPhotoIds = new Set<string>();

    if (args.requestingUserId) {
      // Get likes
      const likes = await ctx.db
        .query("likes")
        .withIndex("by_user_id", (q) => q.eq("userId", args.requestingUserId))
        .collect();

      likedPhotoIds = new Set(likes.map(like => like.photoId));

      // Get bookmarks
      const bookmarks = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_id", (q) => q.eq("userId", args.requestingUserId))
        .collect();

      bookmarkedPhotoIds = new Set(bookmarks.map(bookmark => bookmark.photoId));
    }

    // Get user and album data for each photo
    const photosWithData = await Promise.all(
      photos.map(async (photo) => {
        const album = await ctx.db.get(photo.albumId);
        const user = await ctx.db.get(photo.userId);
        
        return {
          ...photo,
          isLiked: likedPhotoIds.has(photo._id),
          isBookmarked: bookmarkedPhotoIds.has(photo._id),
          user: user ? { 
            _id: user._id,
            name: user.name,
            username: user.username,
            avatar: user.avatar 
          } : null,
          album: album ? {
            _id: album._id,
            title: album.title,
            isPrivate: album.isPrivate
          } : null
        };
      })
    );

    return {
      photos: photosWithData,
      nextCursor: photos.length === limit ? photos[photos.length - 1]._id : null,
    };
  },
});