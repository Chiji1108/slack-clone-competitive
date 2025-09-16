import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Send a message to a channel
 */
export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    content: v.string(),
    messageType: v.union(
      v.literal("text"),
      v.literal("file"),
      v.literal("image"),
      v.literal("system")
    ),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    replyTo: v.optional(v.id("messages")),
  },
  returns: v.id("messages"),
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

    // Check if user is a member of the channel
    const channelMembership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();

    if (!channelMembership) {
      throw new Error("Not a member of this channel");
    }

    const messageId = await ctx.db.insert("messages", {
      content: args.content,
      channelId: args.channelId,
      authorId: userId,
      workspaceId: channel.workspaceId,
      messageType: args.messageType,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      fileSize: args.fileSize,
      replyTo: args.replyTo,
      createdAt: Date.now(),
    });

    return messageId;
  },
});

/**
 * Get messages for a channel
 */
export const getChannelMessages = query({
  args: {
    channelId: v.id("channels"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _creationTime: v.number(),
      _id: v.id("messages"),
      content: v.string(),
      channelId: v.id("channels"),
      authorId: v.id("users"),
      workspaceId: v.id("workspaces"),
      messageType: v.union(
        v.literal("text"),
        v.literal("file"),
        v.literal("image"),
        v.literal("system")
      ),
      fileUrl: v.optional(v.string()),
      fileName: v.optional(v.string()),
      fileSize: v.optional(v.number()),
      replyTo: v.optional(v.id("messages")),
      editedAt: v.optional(v.number()),
      createdAt: v.number(),
      author: v.object({
        _id: v.id("users"),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        image: v.optional(v.string()),
        _creationTime: v.number(),
      }),
      replyToMessage: v.optional(
        v.object({
          _creationTime: v.number(),
          _id: v.id("messages"),
          content: v.string(),
          authorId: v.id("users"),
          createdAt: v.number(),
          author: v.object({
            _id: v.id("users"),
            name: v.optional(v.string()),
            email: v.optional(v.string()),
            image: v.optional(v.string()),
            _creationTime: v.number(),
          }),
        })
      ),
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

    const limit = args.limit ?? 50;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel_and_created", (q) =>
        q.eq("channelId", args.channelId)
      )
      .order("desc")
      .take(limit);

    const messagesWithDetails = [];
    for (const message of messages) {
      const author = await ctx.db.get(message.authorId);
      if (!author) continue;

      let replyToMessage;
      if (message.replyTo) {
        const replyMessage = await ctx.db.get(message.replyTo);
        if (replyMessage) {
          const replyAuthor = await ctx.db.get(replyMessage.authorId);
          if (replyAuthor) {
            replyToMessage = {
              ...replyMessage,
              author: replyAuthor,
            };
          }
        }
      }

      messagesWithDetails.push({
        ...message,
        author,
        replyToMessage,
      });
    }

    // Return messages in ascending order (oldest first)
    return messagesWithDetails.reverse();
  },
});

/**
 * Edit a message
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is the author of the message
    if (message.authorId !== userId) {
      throw new Error("Not authorized to edit this message");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      editedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Delete a message
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is the author of the message or has admin permissions
    const workspaceMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", message.workspaceId).eq("userId", userId)
      )
      .unique();

    if (
      message.authorId !== userId &&
      (!workspaceMembership ||
        (workspaceMembership.role !== "owner" &&
          workspaceMembership.role !== "admin"))
    ) {
      throw new Error("Not authorized to delete this message");
    }

    await ctx.db.delete(args.messageId);

    return null;
  },
});

/**
 * Add reaction to a message
 */
export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is a member of the workspace
    const workspaceMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", message.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!workspaceMembership) {
      throw new Error("Not a member of this workspace");
    }

    // Check if user already reacted with this emoji
    const existingReaction = await ctx.db
      .query("messageReactions")
      .withIndex("by_message_and_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .unique();

    if (existingReaction) {
      throw new Error("Already reacted with this emoji");
    }

    await ctx.db.insert("messageReactions", {
      messageId: args.messageId,
      userId,
      emoji: args.emoji,
      createdAt: Date.now(),
    });

    return null;
  },
});

/**
 * Remove reaction from a message
 */
export const removeReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Find and remove the reaction
    const reaction = await ctx.db
      .query("messageReactions")
      .withIndex("by_message_and_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .unique();

    if (reaction) {
      await ctx.db.delete(reaction._id);
    }

    return null;
  },
});

/**
 * Get message reactions
 */
export const getMessageReactions = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.array(
    v.object({
      _creationTime: v.number(),
      _id: v.id("messageReactions"),
      emoji: v.string(),
      userId: v.id("users"),
      createdAt: v.number(),
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

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return [];
    }

    // Check if user is a member of the workspace
    const workspaceMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", message.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!workspaceMembership) {
      return [];
    }

    const reactions = await ctx.db
      .query("messageReactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    const reactionsWithDetails = [];
    for (const reaction of reactions) {
      const user = await ctx.db.get(reaction.userId);
      if (user) {
        reactionsWithDetails.push({
          ...reaction,
          user,
        });
      }
    }

    return reactionsWithDetails;
  },
});

/**
 * Send a direct message
 */
export const sendDirectMessage = mutation({
  args: {
    receiverId: v.id("users"),
    workspaceId: v.id("workspaces"),
    content: v.string(),
    messageType: v.union(
      v.literal("text"),
      v.literal("file"),
      v.literal("image")
    ),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    replyTo: v.optional(v.id("directMessages")),
  },
  returns: v.id("directMessages"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if both users are members of the workspace
    const senderMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    const receiverMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.receiverId)
      )
      .unique();

    if (!(senderMembership && receiverMembership)) {
      throw new Error("Both users must be members of the workspace");
    }

    const messageId = await ctx.db.insert("directMessages", {
      content: args.content,
      senderId: userId,
      receiverId: args.receiverId,
      workspaceId: args.workspaceId,
      messageType: args.messageType,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      fileSize: args.fileSize,
      replyTo: args.replyTo,
      createdAt: Date.now(),
    });

    return messageId;
  },
});

/**
 * Get direct messages between two users
 */
export const getDirectMessages = query({
  args: {
    otherUserId: v.id("users"),
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _creationTime: v.number(),
      _id: v.id("directMessages"),
      content: v.string(),
      senderId: v.id("users"),
      receiverId: v.id("users"),
      workspaceId: v.id("workspaces"),
      messageType: v.union(
        v.literal("text"),
        v.literal("file"),
        v.literal("image")
      ),
      fileUrl: v.optional(v.string()),
      fileName: v.optional(v.string()),
      fileSize: v.optional(v.number()),
      replyTo: v.optional(v.id("directMessages")),
      editedAt: v.optional(v.number()),
      createdAt: v.number(),
      sender: v.object({
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

    // Check if both users are members of the workspace
    const userMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    const otherUserMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.otherUserId)
      )
      .unique();

    if (!(userMembership && otherUserMembership)) {
      return [];
    }

    const limit = args.limit ?? 50;
    const messages = await ctx.db
      .query("directMessages")
      .withIndex("by_participants_and_created", (q) =>
        q.eq("senderId", userId).eq("receiverId", args.otherUserId)
      )
      .order("desc")
      .take(limit);

    // Also get messages where the current user is the receiver
    const reverseMessages = await ctx.db
      .query("directMessages")
      .withIndex("by_participants_and_created", (q) =>
        q.eq("senderId", args.otherUserId).eq("receiverId", userId)
      )
      .order("desc")
      .take(limit);

    // Combine and sort all messages
    const allMessages = [...messages, ...reverseMessages]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    const messagesWithDetails = [];
    for (const message of allMessages) {
      const sender = await ctx.db.get(message.senderId);
      if (sender) {
        messagesWithDetails.push({
          ...message,
          sender,
        });
      }
    }

    // Return messages in ascending order (oldest first)
    return messagesWithDetails.reverse();
  },
});
