import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get the currently authenticated user's ID
 */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Look up the user by their Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    return user;
  },
});

/**
 * Sync the user's profile with Clerk authentication data
 */
export const syncUserProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Extract user data from the identity token
    const clerkId = identity.subject;
    const name = identity.name || "User";
    const email = identity.email || "";
    const username = identity.preferredUsername || email.split("@")[0];
    const avatar = identity.pictureUrl || "";

    // Check if the user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existingUser) {
      // Update existing user
      return await ctx.db.patch(existingUser._id, {
        name,
        username,
        email,
        avatar,
        searchText: `${name} ${username} ${email}`.toLowerCase(),
      });
    } else {
      // Create a new user
      return await ctx.db.insert("users", {
        clerkId,
        name,
        username,
        email,
        avatar,
        joinedAt: new Date().toISOString(),
        albumCount: 0,
        totalPhotos: 0,
        followersCount: 0,
        followingCount: 0,
        searchText: `${name} ${username} ${email}`.toLowerCase(),
      });
    }
  },
});

/**
 * Check if a username is available
 */
export const isUsernameAvailable = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user (if any)
    const identity = await ctx.auth.getUserIdentity();
    let currentUser = null;
    
    if (identity) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();
    }

    // Check if username is already taken
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    // If the username belongs to the current user, it's available
    if (existingUser && currentUser && existingUser._id === currentUser._id) {
      return true;
    }

    // Otherwise, it's available if no user has it
    return !existingUser;
  },
});

/**
 * Update user profile
 */
export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // If changing username, check if it's available
    if (args.username && args.username !== user.username) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", args.username))
        .first();

      if (existingUser) {
        throw new ConvexError("Username already taken");
      }
    }

    // Update profile fields
    const updates: any = {};
    
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    
    if (args.username !== undefined) {
      updates.username = args.username;
    }
    
    if (args.avatar !== undefined) {
      updates.avatar = args.avatar;
    }
    
    // Update search text if name or username changed
    if (args.name !== undefined || args.username !== undefined) {
      updates.searchText = `${args.name || user.name} ${args.username || user.username} ${user.email}`.toLowerCase();
    }

    // Update the user profile
    await ctx.db.patch(user._id, updates);

    return user._id;
  },
});

/**
 * Middleware to get the authenticated user
 */
export const getAuthenticatedUser = async (ctx: any) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // Look up the user by their Clerk ID
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  return user;
};

/**
 * Delete a user's account
 */
export const deleteUserAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Delete user's photos, albums, likes, comments, etc.
    // 1. Get all user's albums
    const albums = await ctx.db
      .query("albums")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    // 2. Delete photos in each album
    for (const album of albums) {
      const photos = await ctx.db
        .query("photos")
        .withIndex("by_album_id", (q) => q.eq("albumId", album._id))
        .collect();

      // Delete each photo
      for (const photo of photos) {
        // Delete photo likes
        const photoLikes = await ctx.db
          .query("likes")
          .withIndex("by_photo_id", (q) => q.eq("photoId", photo._id))
          .collect();

        for (const like of photoLikes) {
          await ctx.db.delete(like._id);
        }

        // Delete photo comments
        const photoComments = await ctx.db
          .query("comments")
          .withIndex("by_photo_id", (q) => q.eq("photoId", photo._id))
          .collect();

        for (const comment of photoComments) {
          await ctx.db.delete(comment._id);
        }

        // Delete photo bookmarks
        const photoBookmarks = await ctx.db
          .query("bookmarks")
          .withIndex("by_photo_id", (q) => q.eq("photoId", photo._id))
          .collect();

        for (const bookmark of photoBookmarks) {
          await ctx.db.delete(bookmark._id);
        }

        // Delete the photo
        try {
          await ctx.storage.delete(photo.storageId);
        } catch (error) {
          // Continue with deletion even if storage deletion fails
          console.error("Failed to delete photo from storage:", error);
        }
        await ctx.db.delete(photo._id);
      }

      // Delete the album
      await ctx.db.delete(album._id);
    }

    // 3. Delete user's follows
    const followingRelations = await ctx.db
      .query("follows")
      .withIndex("by_follower_id", (q) => q.eq("followerId", user._id))
      .collect();

    for (const follow of followingRelations) {
      await ctx.db.delete(follow._id);
    }

    const followerRelations = await ctx.db
      .query("follows")
      .withIndex("by_followed_id", (q) => q.eq("followedId", user._id))
      .collect();

    for (const follow of followerRelations) {
      await ctx.db.delete(follow._id);
    }

    // 4. Delete user's activities
    const activities = await ctx.db
      .query("activities")
      .filter((q) => 
        q.or(
          q.eq(q.field("userId"), user._id),
          q.eq(q.field("targetUserId"), user._id)
        )
      )
      .collect();

    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    // 5. Finally, delete the user
    await ctx.db.delete(user._id);

    return { success: true };
  },
});

/**
 * Get user session data
 */
export const getUserSession = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return {
      userId: identity.subject,
      name: identity.name,
      email: identity.email,
      pictureUrl: identity.pictureUrl,
    };
  },
});