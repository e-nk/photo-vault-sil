import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create or update a user profile from Clerk authentication
 */
export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    username: v.string(),
    email: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      // Update existing user
      return await ctx.db.patch(existingUser._id, {
        name: args.name,
        username: args.username,
        email: args.email,
        avatar: args.avatar,
        searchText: `${args.name} ${args.username} ${args.email}`, // For searching
      });
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        name: args.name,
        username: args.username,
        email: args.email,
        avatar: args.avatar,
        joinedAt: new Date().toISOString(),
        albumCount: 0,
        totalPhotos: 0,
        followersCount: 0,
        followingCount: 0,
        searchText: `${args.name} ${args.username} ${args.email}`, // For searching
      });
    }
  },
});

/**
 * Get the current authenticated user
 */
export const getCurrentUser = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user;
  },
});

/**
 * Get user by ID
 */
export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user;
  },
});

/**
 * Get all users (paginated)
 */
export const getAllUsers = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("users")),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    let query = ctx.db.query("users");

    // Apply search filter if provided
    if (args.searchTerm && args.searchTerm.trim() !== "") {
      const searchText = args.searchTerm.toLowerCase();
      query = query.withSearchIndex("by_search", (q) => 
        q.search("searchText", searchText)
      );
    }

    // Apply cursor pagination if provided
    if (args.cursor) {
      query = query.withCursor(args.cursor);
    }

    const users = await query.take(limit);
    
    // Return users and the cursor for the next page
    return {
      users,
      nextCursor: users.length === limit ? users[users.length - 1]._id : null,
    };
  },
});

/**
 * Check if the current user is following another user
 */
export const isFollowing = query({
  args: {
    followerId: v.id("users"),
    followedId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const follow = await ctx.db
      .query("follows")
      .withIndex("by_both_ids", (q) => 
        q.eq("followerId", args.followerId).eq("followedId", args.followedId)
      )
      .first();
    
    return !!follow;
  },
});

/**
 * Follow a user
 */
export const followUser = mutation({
  args: {
    followerId: v.id("users"),
    followedId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Prevent self-following
    if (args.followerId === args.followedId) {
      throw new ConvexError("You cannot follow yourself");
    }

    // Check if already following
    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_both_ids", (q) => 
        q.eq("followerId", args.followerId).eq("followedId", args.followedId)
      )
      .first();

    if (existingFollow) {
      return existingFollow._id;
    }

    // Create the follow relationship
    const followId = await ctx.db.insert("follows", {
      followerId: args.followerId,
      followedId: args.followedId,
      createdAt: new Date().toISOString(),
    });

    // Update follower counts
    const follower = await ctx.db.get(args.followerId);
    const followed = await ctx.db.get(args.followedId);

    if (follower) {
      await ctx.db.patch(args.followerId, {
        followingCount: (follower.followingCount || 0) + 1,
      });
    }

    if (followed) {
      await ctx.db.patch(args.followedId, {
        followersCount: (followed.followersCount || 0) + 1,
      });
    }

    // Create an activity for this follow
    await ctx.db.insert("activities", {
      userId: args.followerId,
      targetUserId: args.followedId,
      type: "follow",
      read: false,
      createdAt: new Date().toISOString(),
    });

    return followId;
  },
});

/**
 * Unfollow a user
 */
export const unfollowUser = mutation({
  args: {
    followerId: v.id("users"),
    followedId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find the follow relationship
    const follow = await ctx.db
      .query("follows")
      .withIndex("by_both_ids", (q) => 
        q.eq("followerId", args.followerId).eq("followedId", args.followedId)
      )
      .first();

    if (!follow) {
      throw new ConvexError("You are not following this user");
    }

    // Delete the follow relationship
    await ctx.db.delete(follow._id);

    // Update follower counts
    const follower = await ctx.db.get(args.followerId);
    const followed = await ctx.db.get(args.followedId);

    if (follower && follower.followingCount > 0) {
      await ctx.db.patch(args.followerId, {
        followingCount: follower.followingCount - 1,
      });
    }

    if (followed && followed.followersCount > 0) {
      await ctx.db.patch(args.followedId, {
        followersCount: followed.followersCount - 1,
      });
    }

    return follow._id;
  },
});

/**
 * Get user's followers
 */
export const getUserFollowers = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("follows")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    let query = ctx.db
      .query("follows")
      .withIndex("by_followed_id", (q) => q.eq("followedId", args.userId));

    if (args.cursor) {
      query = query.withCursor(args.cursor);
    }

    const follows = await query.take(limit);
    
    // Get the actual user objects for each follower
    const followerIds = follows.map(follow => follow.followerId);
    const followers = await Promise.all(
      followerIds.map(id => ctx.db.get(id))
    );

    // Remove any null values (in case a user was deleted)
    const validFollowers = followers.filter(Boolean);

    return {
      followers: validFollowers,
      nextCursor: follows.length === limit ? follows[follows.length - 1]._id : null,
    };
  },
});

/**
 * Get users that a user is following
 */
export const getUserFollowing = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("follows")),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    let query = ctx.db
      .query("follows")
      .withIndex("by_follower_id", (q) => q.eq("followerId", args.userId));

    if (args.cursor) {
      query = query.withCursor(args.cursor);
    }

    const follows = await query.take(limit);
    
    // Get the actual user objects for each followed user
    const followedIds = follows.map(follow => follow.followedId);
    const following = await Promise.all(
      followedIds.map(id => ctx.db.get(id))
    );

    // Remove any null values (in case a user was deleted)
    const validFollowing = following.filter(Boolean);

    return {
      following: validFollowing,
      nextCursor: follows.length === limit ? follows[follows.length - 1]._id : null,
    };
  },
});