import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - extends Clerk authentication with app-specific user data
  users: defineTable({
    // Clerk user ID
    clerkId: v.string(),
    // User profile information
    name: v.string(),
    username: v.string(),
    email: v.string(),
    // User avatar URL
    avatar: v.optional(v.string()),
    // When the user joined
    joinedAt: v.string(),
    // User stats (computed fields, can be updated on relevant actions)
    albumCount: v.number(),
    totalPhotos: v.number(),
    followersCount: v.number(),
    followingCount: v.number(),
    // For full-text search
    searchText: v.string(),
  }).index("by_clerk_id", ["clerkId"])
    .index("by_username", ["username"])
    .index("by_search", ["searchText"]),

  // Albums table - collections of photos
  albums: defineTable({
    // Album details
    title: v.string(),
    description: v.optional(v.string()),
    // Privacy settings
    isPrivate: v.boolean(),
    // Reference to user who owns the album
    userId: v.id("users"),
    // Album stats
    photoCount: v.number(),
    // Album cover image (typically the first photo or a selected one)
    coverImage: v.optional(v.string()),
    // Timestamps
    dateCreated: v.string(),
    dateUpdated: v.string(),
    // For full-text search
    searchText: v.string(),
  }).index("by_user_id", ["userId"])
    .index("by_privacy", ["isPrivate"])
    .index("by_search", ["searchText"]),

  // Photos table - individual photos that belong to albums
  photos: defineTable({
    // Photo details
    title: v.string(),
    description: v.optional(v.string()),
    // URLs for different sizes
    url: v.string(),           // Original/full-size image
    thumbnailUrl: v.string(),  // Thumbnail for grids
    // References
    albumId: v.id("albums"),
    userId: v.id("users"),     // Owner of the photo
    // Metadata
    dateUploaded: v.string(),
    aspectRatio: v.number(),
    // Storage file path (for deletion/management)
    storageId: v.string(),
    // Stats
    likes: v.number(),       // Count of likes
    comments: v.number(),    // Count of comments
    // For full-text search
    searchText: v.string(),
  }).index("by_album_id", ["albumId"])
    .index("by_user_id", ["userId"])
    .index("by_search", ["searchText"]),

  // Likes table - tracks which users liked which photos
  likes: defineTable({
    photoId: v.id("photos"),
    userId: v.id("users"),
    createdAt: v.string(),
  }).index("by_photo_id", ["photoId"])
    .index("by_user_id", ["userId"])
    .index("by_photo_and_user", ["photoId", "userId"]),

  // Comments table - user comments on photos
  comments: defineTable({
    photoId: v.id("photos"),
    userId: v.id("users"),
    content: v.string(),
    createdAt: v.string(),
  }).index("by_photo_id", ["photoId"])
    .index("by_user_id", ["userId"]),

  // Bookmarks/Saves table - tracks which photos a user has saved
  bookmarks: defineTable({
    photoId: v.id("photos"),
    userId: v.id("users"),
    createdAt: v.string(),
  }).index("by_user_id", ["userId"])
    .index("by_photo_id", ["photoId"])
    .index("by_user_and_photo", ["userId", "photoId"]),

  // Follows table - tracks user follow relationships
  follows: defineTable({
    followerId: v.id("users"),  // User who is following
    followedId: v.id("users"),  // User who is being followed
    createdAt: v.string(),
  }).index("by_follower_id", ["followerId"])
    .index("by_followed_id", ["followedId"])
    .index("by_both_ids", ["followerId", "followedId"]),

  // Activity table - tracks user activity for notifications
  activities: defineTable({
    userId: v.id("users"),         // User who performed the action
    targetUserId: v.id("users"),   // User who should be notified
    type: v.string(),              // Type of activity (like, comment, follow, etc.)
    photoId: v.optional(v.id("photos")),
    albumId: v.optional(v.id("albums")),
    commentId: v.optional(v.id("comments")),
    read: v.boolean(),
    createdAt: v.string(),
  }).index("by_target_user", ["targetUserId", "read"])
    .index("by_user", ["userId"]),
});