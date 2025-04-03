import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new album
 */
export const createAlbum = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
    userId: v.id("users"),
    coverImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Create the album
    const albumId = await ctx.db.insert("albums", {
      title: args.title,
      description: args.description,
      isPrivate: args.isPrivate,
      userId: args.userId,
      photoCount: 0,
      coverImage: args.coverImage || null, // Default cover or placeholder
      dateCreated: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
      searchText: `${args.title} ${args.description || ''}`.toLowerCase(),
    });

    // Update user's album count
    await ctx.db.patch(args.userId, {
      albumCount: (user.albumCount || 0) + 1,
    });

    return albumId;
  },
});

/**
 * Update an existing album
 */
export const updateAlbum = mutation({
  args: {
    albumId: v.id("albums"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    coverImage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the album exists
    const album = await ctx.db.get(args.albumId);
    if (!album) {
      throw new ConvexError("Album not found");
    }

    // Create updates object
    const updates: any = {
      dateUpdated: new Date().toISOString(),
    };

    if (args.title !== undefined) {
      updates.title = args.title;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.isPrivate !== undefined) {
      updates.isPrivate = args.isPrivate;
    }

    if (args.coverImage !== undefined) {
      updates.coverImage = args.coverImage;
    }

    // Update search text if title or description changed
    if (args.title !== undefined || args.description !== undefined) {
      updates.searchText = `${args.title || album.title} ${args.description || album.description || ''}`.toLowerCase();
    }

    // Update the album
    await ctx.db.patch(args.albumId, updates);

    return args.albumId;
  },
});

/**
 * Delete an album and all its photos
 */
export const deleteAlbum = mutation({
  args: {
    albumId: v.id("albums"),
    userId: v.id("users"), // The user requesting the deletion
  },
  handler: async (ctx, args) => {
    // Verify the album exists
    const album = await ctx.db.get(args.albumId);
    if (!album) {
      throw new ConvexError("Album not found");
    }

    // Check ownership
    if (album.userId !== args.userId) {
      throw new ConvexError("You don't have permission to delete this album");
    }

    // Get all photos in the album
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_album_id", (q) => q.eq("albumId", args.albumId))
      .collect();

    // Delete all photos in the album
    for (const photo of photos) {
      // TODO: Delete photo files from storage
      await ctx.db.delete(photo._id);
    }

    // Delete the album
    await ctx.db.delete(args.albumId);

    // Update user's album count
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.patch(args.userId, {
        albumCount: Math.max(0, (user.albumCount || 0) - 1),
        totalPhotos: Math.max(0, (user.totalPhotos || 0) - photos.length),
      });
    }

    return args.albumId;
  },
});

/**
 * Get an album by ID
 */
export const getAlbumById = query({
  args: {
    albumId: v.id("albums"),
    requestingUserId: v.optional(v.id("users")), // The user requesting the album
  },
  handler: async (ctx, args) => {
    const album = await ctx.db.get(args.albumId);
    
    if (!album) {
      return null;
    }

    // Check privacy settings
    if (album.isPrivate && album.userId !== args.requestingUserId) {
      // Private album that doesn't belong to the requesting user
      return null;
    }

    return album;
  },
});

/**
 * Get all albums for a user
 */
export const getAlbumsByUserId = query({
  args: {
    userId: v.id("users"),
    requestingUserId: v.optional(v.id("users")), // The user requesting the albums
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("albums")),
    searchTerm: v.optional(v.string()),
    sortBy: v.optional(v.string()), // 'newest', 'oldest', 'title', etc.
    sortOrder: v.optional(v.string()), // 'asc', 'desc'
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    let query = ctx.db
      .query("albums")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId));

    // Apply privacy filter
    if (args.userId !== args.requestingUserId) {
      // If not the owner, only show public albums
      query = query.filter((q) => q.eq(q.field("isPrivate"), false));
    }

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
      const order = args.sortOrder === "asc" ? "asc" : "desc";
      switch (args.sortBy) {
        case "newest":
          query = query.order(order === "asc" ? "asc" : "desc", "dateCreated");
          break;
        case "oldest":
          query = query.order(order === "desc" ? "asc" : "desc", "dateCreated");
          break;
        case "title":
          query = query.order(order, "title");
          break;
        case "updated":
          query = query.order(order === "asc" ? "asc" : "desc", "dateUpdated");
          break;
        case "photoCount":
          query = query.order(order === "asc" ? "asc" : "desc", "photoCount");
          break;
        default:
          query = query.order("desc", "dateCreated");
      }
    } else {
      // Default sort: most recent first
      query = query.order("desc", "dateCreated");
    }

    const albums = await query.take(limit);
    
    return {
      albums,
      nextCursor: albums.length === limit ? albums[albums.length - 1]._id : null,
    };
  },
});

/**
 * Get all albums (with proper privacy filtering)
 */
export const getAllAlbums = query({
  args: {
    requestingUserId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("albums")),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    let query = ctx.db.query("albums");

    // Apply privacy filter - only show public albums unless requesting own albums
    if (args.requestingUserId) {
      query = query.filter((q) => 
        q.or(
          q.eq(q.field("isPrivate"), false),
          q.eq(q.field("userId"), args.requestingUserId)
        )
      );
    } else {
      // No user specified, only show public albums
      query = query.filter((q) => q.eq(q.field("isPrivate"), false));
    }

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

    // Default sort: most recent first
    query = query.order("desc", "dateCreated");

    const albums = await query.take(limit);
    
    // Also fetch the user for each album
    const albumsWithUsers = await Promise.all(
      albums.map(async (album) => {
        const user = await ctx.db.get(album.userId);
        return {
          ...album,
          user,
        };
      })
    );
    
    return {
      albums: albumsWithUsers,
      nextCursor: albums.length === limit ? albums[albums.length - 1]._id : null,
    };
  },
});

/**
 * Update album cover
 */
export const updateAlbumCover = mutation({
  args: {
    albumId: v.id("albums"),
    coverImageUrl: v.string(),
    userId: v.id("users"), // The user requesting the update
  },
  handler: async (ctx, args) => {
    // Verify the album exists
    const album = await ctx.db.get(args.albumId);
    if (!album) {
      throw new ConvexError("Album not found");
    }

    // Check ownership
    if (album.userId !== args.userId) {
      throw new ConvexError("You don't have permission to update this album");
    }

    // Update the album cover
    await ctx.db.patch(args.albumId, {
      coverImage: args.coverImageUrl,
      dateUpdated: new Date().toISOString(),
    });

    return args.albumId;
  },
});