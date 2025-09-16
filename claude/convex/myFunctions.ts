import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Workspace functions
export const createWorkspace = mutation({
  args: { name: v.string() },
  returns: v.object({
    workspaceId: v.id("workspaces"),
    joinCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Client is not authenticated!");
    }

    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      joinCode,
      userId,
    });

    await ctx.db.insert("members", {
      workspaceId,
      userId,
      role: "admin",
    });

    await ctx.db.insert("channels", {
      name: "general",
      workspaceId,
    });

    return { workspaceId, joinCode };
  },
});

export const joinWorkspace = mutation({
  args: { joinCode: v.string() },
  returns: v.object({ workspaceId: v.id("workspaces") }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Client is not authenticated!");
    }

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_join_code", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspace._id).eq("userId", userId)
      )
      .unique();

    if (existingMember) {
      throw new Error("Already a member of this workspace");
    }

    await ctx.db.insert("members", {
      workspaceId: workspace._id,
      userId,
      role: "member",
    });

    return { workspaceId: workspace._id };
  },
});

export const getWorkspaces = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("workspaces"),
      name: v.string(),
      joinCode: v.string(),
      userId: v.id("users"),
      _creationTime: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const members = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const workspaces = [];
    for (const member of members) {
      const workspace = await ctx.db.get(member.workspaceId);
      if (workspace) {
        workspaces.push(workspace);
      }
    }

    return workspaces;
  },
});

// Channel functions
export const createChannel = mutation({
  args: { name: v.string(), workspaceId: v.id("workspaces") },
  returns: v.id("channels"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Client is not authenticated!");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!member || member.role !== "admin") {
      throw new Error("Only admins can create channels");
    }

    return await ctx.db.insert("channels", {
      name: args.name,
      workspaceId: args.workspaceId,
    });
  },
});

export const getChannels = query({
  args: { workspaceId: v.id("workspaces") },
  returns: v.array(
    v.object({
      _id: v.id("channels"),
      name: v.string(),
      workspaceId: v.id("workspaces"),
      _creationTime: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!member) {
      return [];
    }

    return await ctx.db
      .query("channels")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});

// Message functions
export const sendMessage = mutation({
  args: {
    content: v.string(),
    channelId: v.id("channels"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Client is not authenticated!");
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!member) {
      throw new Error("Not a member of this workspace");
    }

    await ctx.db.insert("messages", {
      content: args.content,
      channelId: args.channelId,
      userId,
    });

    return null;
  },
});

export const getMessages = query({
  args: { channelId: v.id("channels") },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      content: v.string(),
      channelId: v.id("channels"),
      userId: v.id("users"),
      _creationTime: v.number(),
      user: v.object({
        name: v.optional(v.string()),
      }),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      return [];
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", channel.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!member) {
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(100);

    const messagesWithUser = [];
    for (const message of messages) {
      const user = await ctx.db.get(message.userId);
      messagesWithUser.push({
        ...message,
        user: {
          name: user?.name,
        },
      });
    }

    return messagesWithUser.reverse();
  },
});

export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      image: v.optional(v.string()),
      _creationTime: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});
