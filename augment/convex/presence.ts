import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

/**
 * Update user's online status
 */
export const updatePresence = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    isOnline: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    // Check if user is a member of the workspace
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      throw new Error("User must be a member of the workspace");
    }

    // Find existing presence record
    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    const now = Date.now();

    if (existingPresence) {
      await ctx.db.patch(existingPresence._id, {
        isOnline: args.isOnline,
        lastSeen: now,
      });
    } else {
      await ctx.db.insert("userPresence", {
        workspaceId: args.workspaceId,
        userId,
        isOnline: args.isOnline,
        lastSeen: now,
      });
    }

    return null;
  },
});

/**
 * Get online users in a workspace
 */
export const getWorkspacePresence = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      user: v.object({
        _id: v.id("users"),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
      isOnline: v.boolean(),
      lastSeen: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Check if user is a member of the workspace
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      return [];
    }

    const presenceRecords = await ctx.db
      .query("userPresence")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const presenceWithUsers: Array<{
      userId: Id<"users">;
      user: {
        _id: Id<"users">;
        email: string | undefined;
        name?: string;
      };
      isOnline: boolean;
      lastSeen: number;
    }> = [];

    for (const presence of presenceRecords) {
      const user = await ctx.db.get(presence.userId);
      if (user) {
        presenceWithUsers.push({
          userId: presence.userId,
          user: {
            _id: user._id,
            email: user.email,
            name: user.name,
          },
          isOnline: presence.isOnline,
          lastSeen: presence.lastSeen,
        });
      }
    }

    return presenceWithUsers;
  },
});

/**
 * Mark user as offline (called when user leaves)
 */
export const markOffline = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (existingPresence) {
      await ctx.db.patch(existingPresence._id, {
        isOnline: false,
        lastSeen: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Cleanup old presence records (can be called by a cron job)
 */
export const cleanupPresence = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const SECONDS_PER_MINUTE = 60;
    const MINUTES_PER_HOUR = 60;
    const MILLISECONDS_PER_SECOND = 1000;
    const MILLISECONDS_PER_HOUR =
      SECONDS_PER_MINUTE * MINUTES_PER_HOUR * MILLISECONDS_PER_SECOND;
    const oneHourAgo = Date.now() - MILLISECONDS_PER_HOUR;

    const oldPresenceRecords = await ctx.db
      .query("userPresence")
      .filter((q) => q.lt(q.field("lastSeen"), oneHourAgo))
      .collect();

    for (const record of oldPresenceRecords) {
      await ctx.db.patch(record._id, {
        isOnline: false,
      });
    }

    return null;
  },
});
