import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new channel in a workspace
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
      throw new Error("User must be authenticated to create a channel");
    }

    // Check if user is a member of the workspace
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      throw new Error(
        "User must be a member of the workspace to create channels"
      );
    }

    // Check if channel name already exists in this workspace
    const existingChannel = await ctx.db
      .query("channels")
      .withIndex("by_workspace_and_name", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("name", args.name)
      )
      .unique();

    if (existingChannel) {
      throw new Error("Channel name already exists in this workspace");
    }

    const channelId = await ctx.db.insert("channels", {
      workspaceId: args.workspaceId,
      name: args.name,
      description: args.description,
      isPrivate: args.isPrivate,
      createdBy: userId,
    });

    // Add the creator to the channel
    await ctx.db.insert("channelMembers", {
      channelId,
      userId,
    });

    // If it's a public channel, add all workspace members
    if (!args.isPrivate) {
      const workspaceMembers = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .collect();

      for (const member of workspaceMembers) {
        if (member.userId !== userId) {
          await ctx.db.insert("channelMembers", {
            channelId,
            userId: member.userId,
          });
        }
      }
    }

    return channelId;
  },
});

/**
 * Get all channels in a workspace that the user has access to
 */
export const getWorkspaceChannels = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.array(
    v.object({
      _id: v.id("channels"),
      _creationTime: v.number(),
      workspaceId: v.id("workspaces"),
      name: v.string(),
      description: v.optional(v.string()),
      isPrivate: v.boolean(),
      createdBy: v.id("users"),
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

    // Get channels the user is a member of
    const channelMemberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const channels = [];
    for (const channelMembership of channelMemberships) {
      const channel = await ctx.db.get(channelMembership.channelId);
      if (channel && channel.workspaceId === args.workspaceId) {
        channels.push(channel);
      }
    }

    return channels.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Get channel details by ID
 */
export const getChannel = query({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.union(
    v.object({
      _id: v.id("channels"),
      _creationTime: v.number(),
      workspaceId: v.id("workspaces"),
      name: v.string(),
      description: v.optional(v.string()),
      isPrivate: v.boolean(),
      createdBy: v.id("users"),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Check if user is a member of this channel
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const channel = await ctx.db.get(args.channelId);
    return channel;
  },
});

/**
 * Add a user to a private channel
 */
export const addMemberToChannel = mutation({
  args: {
    channelId: v.id("channels"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("User must be authenticated");
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    // Check if current user is a member of this channel
    const currentUserMembership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", currentUserId)
      )
      .unique();

    if (!currentUserMembership) {
      throw new Error("You must be a member of this channel to add others");
    }

    // Check if target user is a member of the workspace
    const workspaceMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", args.userId)
      )
      .unique();

    if (!workspaceMembership) {
      throw new Error("User must be a member of the workspace");
    }

    // Check if user is already a member of the channel
    const existingMembership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .unique();

    if (existingMembership) {
      throw new Error("User is already a member of this channel");
    }

    // Add user to channel
    await ctx.db.insert("channelMembers", {
      channelId: args.channelId,
      userId: args.userId,
    });

    return null;
  },
});

/**
 * Get all members of a channel
 */
export const getChannelMembers = query({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Check if user is a member of this channel
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      return [];
    }

    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    const members = [];
    for (const membershipRecord of memberships) {
      const user = await ctx.db.get(membershipRecord.userId);
      if (user) {
        members.push({
          _id: user._id,
          email: user.email,
          name: user.name,
        });
      }
    }

    return members;
  },
});
