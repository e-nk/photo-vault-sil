import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Get notifications for a user
 */
export const getUserNotifications = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("activities")),
    includeRead: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    let query = ctx.db
      .query("activities")
      .withIndex("by_target_user", (q) => 
        q.eq("targetUserId", args.userId)
      );

    // Filter by read status if specified
    if (!args.includeRead) {
      query = query.filter((q) => q.eq(q.field("read"), false));
    }

    // Apply cursor pagination if provided
    if (args.cursor) {
      query = query.withCursor(args.cursor);
    }

    // Order by creation date, newest first
    query = query.order("desc", "createdAt");

    const activities = await query.take(limit);

    // Enrich the activities with related data
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        // Get the user who performed the action
        const actionUser = await ctx.db.get(activity.userId);

        // Initialize the enriched activity
        const enriched: any = {
          ...activity,
          actionUser,
        };

        // Add related data based on activity type
        if (activity.type === "like" || activity.type === "comment" || activity.type === "bookmark") {
          if (activity.photoId) {
            const photo = await ctx.db.get(activity.photoId);
            if (photo) {
              enriched.photo = photo;

              // Add album info
              const album = await ctx.db.get(photo.albumId);
              if (album) {
                enriched.album = album;
              }
            }
          }
        } else if (activity.type === "follow") {
          // Nothing additional needed for follow activities
        } else if (activity.type === "album_comment") {
          if (activity.albumId) {
            const album = await ctx.db.get(activity.albumId);
            if (album) {
              enriched.album = album;
            }
          }
        }

        // Add the comment content if it's a comment activity
        if ((activity.type === "comment" || activity.type === "album_comment") && activity.commentId) {
          const comment = await ctx.db.get(activity.commentId);
          if (comment) {
            enriched.comment = comment;
          }
        }

        return enriched;
      })
    );

    return {
      activities: enrichedActivities,
      nextCursor: activities.length === limit ? activities[activities.length - 1]._id : null,
    };
  },
});

/**
 * Mark notifications as read
 */
export const markNotificationsAsRead = mutation({
  args: {
    userId: v.id("users"),
    activityIds: v.optional(v.array(v.id("activities"))),
    markAll: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify that the user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // If markAll is true, mark all notifications as read
    if (args.markAll) {
      const unreadActivities = await ctx.db
        .query("activities")
        .withIndex("by_target_user", (q) => 
          q.eq("targetUserId", args.userId).eq("read", false)
        )
        .collect();

      for (const activity of unreadActivities) {
        await ctx.db.patch(activity._id, {
          read: true,
        });
      }

      return { 
        success: true, 
        count: unreadActivities.length 
      };
    }

    // Otherwise, mark specific notifications as read
    if (!args.activityIds || args.activityIds.length === 0) {
      return { 
        success: true, 
        count: 0 
      };
    }

    let markedCount = 0;
    for (const activityId of args.activityIds) {
      const activity = await ctx.db.get(activityId);
      
      // Skip if activity doesn't exist or doesn't belong to the user
      if (!activity || activity.targetUserId !== args.userId) {
        continue;
      }
      
      // Skip if already read
      if (activity.read) {
        continue;
      }

      await ctx.db.patch(activityId, {
        read: true,
      });

      markedCount++;
    }

    return { 
      success: true, 
      count: markedCount 
    };
  },
});

/**
 * Delete notifications
 */
export const deleteNotifications = mutation({
  args: {
    userId: v.id("users"),
    activityIds: v.array(v.id("activities")),
  },
  handler: async (ctx, args) => {
    // Verify that the user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    let deletedCount = 0;
    for (const activityId of args.activityIds) {
      const activity = await ctx.db.get(activityId);
      
      // Skip if activity doesn't exist or doesn't belong to the user
      if (!activity || activity.targetUserId !== args.userId) {
        continue;
      }

      await ctx.db.delete(activityId);
      deletedCount++;
    }

    return { 
      success: true, 
      count: deletedCount 
    };
  },
});

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unreadActivities = await ctx.db
      .query("activities")
      .withIndex("by_target_user", (q) => 
        q.eq("targetUserId", args.userId).eq("read", false)
      )
      .collect();

    return unreadActivities.length;
  },
});

/**
 * Create a notification/activity
 * This is an internal function used by other mutations
 */
export const createActivity = mutation({
  args: {
    userId: v.id("users"),          // User performing the action
    targetUserId: v.id("users"),    // User receiving the notification
    type: v.string(),               // Activity type (like, comment, follow, etc.)
    photoId: v.optional(v.id("photos")),
    albumId: v.optional(v.id("albums")),
    commentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    // Don't create notifications for self-actions
    if (args.userId === args.targetUserId) {
      return null;
    }

    // Verify that users exist
    const sourceUser = await ctx.db.get(args.userId);
    const targetUser = await ctx.db.get(args.targetUserId);
    
    if (!sourceUser || !targetUser) {
      throw new ConvexError("User not found");
    }

    // Create the activity
    const activityId = await ctx.db.insert("activities", {
      userId: args.userId,
      targetUserId: args.targetUserId,
      type: args.type,
      photoId: args.photoId,
      albumId: args.albumId,
      commentId: args.commentId,
      read: false,
      createdAt: new Date().toISOString(),
    });

    return activityId;
  },
});

/**
 * Clear all notifications for a user
 */
export const clearAllNotifications = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify that the user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_target_user", (q) => 
        q.eq("targetUserId", args.userId)
      )
      .collect();

    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    return { 
      success: true, 
      count: activities.length 
    };
  },
});