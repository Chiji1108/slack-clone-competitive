import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

/**
 * Create a new channel
 */
export const createChannel = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
  },
  returns: v.id("channels"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member of the workspace
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this workspace");
    }

    // Check if channel name already exists in workspace
    const existingChannel = await ctx.db
      .query("channels")
      .withIndex("by_workspace_and_name", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("name", args.name)
      )
      .unique();

    if (existingChannel) {
      throw new Error("Channel name already exists");
    }

    const channelId = await ctx.db.insert("channels", {
      name: args.name,
      description: args.description,
      workspaceId: args.workspaceId,
      isPrivate: args.isPrivate,
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Add the creator as a member of the channel
    await ctx.db.insert("channelMembers", {
      channelId,
      userId,
      joinedAt: Date.now(),
    });

    return channelId;
  },
});

/**
 * Get channels for a workspace
 */
export const getWorkspaceChannels = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.array(
    v.object({
      _id: v.id("channels"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      workspaceId: v.id("workspaces"),
      isPrivate: v.boolean(),
      createdBy: v.id("users"),
      createdAt: v.number(),
      memberCount: v.number(),
      isMember: v.boolean(),
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

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const channelsWithDetails: Array<{
      _id: Id<"channels">;
      _creationTime: number;
      name: string;
      description?: string;
      workspaceId: Id<"workspaces">;
      isPrivate: boolean;
      createdBy: Id<"users">;
      createdAt: number;
      memberCount: number;
      isMember: boolean;
    }> = [];
    for (const channel of channels) {
      // Get member count
      const members = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
        .collect();

      // Check if user is a member of this channel
      const isMember = members.some((member) => member.userId === userId);

      // Only show private channels if user is a member
      if (channel.isPrivate && !isMember) {
        continue;
      }

      channelsWithDetails.push({
        ...channel,
        memberCount: members.length,
        isMember,
      });
    }

    return channelsWithDetails;
  },
});

/**
 * Get channel by ID
 */
export const getChannel = query({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.union(
    v.object({
      _id: v.id("channels"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      workspaceId: v.id("workspaces"),
      isPrivate: v.boolean(),
      createdBy: v.id("users"),
      createdAt: v.number(),
      memberCount: v.number(),
      isMember: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      return null;
    }

    // Check if user is a member of the workspace
    const workspaceMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!workspaceMembership) {
      return null;
    }

    // Get member count
    const members = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    // Check if user is a member of this channel
    const isMember = members.some((member) => member.userId === userId);

    // Only show private channels if user is a member
    if (channel.isPrivate && !isMember) {
      return null;
    }

    return {
      ...channel,
      memberCount: members.length,
      isMember,
    };
  },
});

/**
 * Join a channel
 */
export const joinChannel = mutation({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Check if user is a member of the workspace
    const workspaceMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!workspaceMembership) {
      throw new Error("Not a member of this workspace");
    }

    // Check if user is already a member of the channel
    const existingMembership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();

    if (existingMembership) {
      throw new Error("Already a member of this channel");
    }

    // Add user to channel
    await ctx.db.insert("channelMembers", {
      channelId: args.channelId,
      userId,
      joinedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Leave a channel
 */
export const leaveChannel = mutation({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Find and remove the membership
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();

    if (membership) {
      await ctx.db.delete(membership._id);
    }

    return null;
  },
});

/**
 * Get channel members
 */
export const getChannelMembers = query({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.array(
    v.object({
      _id: v.id("channelMembers"),
      userId: v.id("users"),
      joinedAt: v.number(),
      user: v.object({
        _id: v.id("users"),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        image: v.optional(v.string()),
        _creationTime: v.number(),
      }),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      return [];
    }

    // Check if user is a member of the workspace
    const workspaceMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!workspaceMembership) {
      return [];
    }

    // Check if user is a member of the channel (for private channels)
    if (channel.isPrivate) {
      const channelMembership = await ctx.db
        .query("channelMembers")
        .withIndex("by_channel_and_user", (q) =>
          q.eq("channelId", args.channelId).eq("userId", userId)
        )
        .unique();

      if (!channelMembership) {
        return [];
      }
    }

    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    const members: Array<{
      _id: Id<"channelMembers">;
      userId: Id<"users">;
      joinedAt: number;
      user: {
        _id: Id<"users">;
        name?: string;
        email?: string;
        image?: string;
        _creationTime: number;
      };
    }> = [];
    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      if (user) {
        members.push({
          ...membership,
          user,
        });
      }
    }

    return members;
  },
});

/**
 * Update channel details
 */
export const updateChannel = mutation({
  args: {
    channelId: v.id("channels"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Check if user is the creator or has admin permissions
    const workspaceMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();

    if (
      !workspaceMembership ||
      (channel.createdBy !== userId &&
        workspaceMembership.role !== "owner" &&
        workspaceMembership.role !== "admin")
    ) {
      throw new Error("Insufficient permissions");
    }

    const updates: Record<string, string | undefined> = {};
    if (args.name !== undefined) {
      // Check if new name already exists
      const newName = args.name;
      if (newName !== channel.name) {
        const existingChannel = await ctx.db
          .query("channels")
          .withIndex("by_workspace_and_name", (q) =>
            q.eq("workspaceId", channel.workspaceId).eq("name", newName)
          )
          .unique();

        if (existingChannel) {
          throw new Error("Channel name already exists");
        }
      }
      updates.name = args.name;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.channelId, updates);
    }

    return null;
  },
});

/**
 * Delete a channel
 */
export const deleteChannel = mutation({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Check if user is the creator or has admin permissions
    const workspaceMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();

    if (
      !workspaceMembership ||
      (channel.createdBy !== userId &&
        workspaceMembership.role !== "owner" &&
        workspaceMembership.role !== "admin")
    ) {
      throw new Error("Insufficient permissions");
    }

    // Delete all channel members
    const members = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete all messages in the channel
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the channel
    await ctx.db.delete(args.channelId);

    return null;
  },
});
