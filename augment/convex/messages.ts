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
    parentMessageId: v.optional(v.id("messages")),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated to send messages");
    }

    // Check if user is a member of this channel
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      throw new Error("User must be a member of the channel to send messages");
    }

    // If this is a reply, verify the parent message exists and is in the same channel
    if (args.parentMessageId) {
      const parentMessage = await ctx.db.get(args.parentMessageId);
      if (!parentMessage || parentMessage.channelId !== args.channelId) {
        throw new Error("Invalid parent message");
      }
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      authorId: userId,
      content: args.content,
      parentMessageId: args.parentMessageId,
    });

    return messageId;
  },
});

/**
 * Get messages from a channel (paginated)
 */
export const getChannelMessages = query({
  args: {
    channelId: v.id("channels"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      channelId: v.id("channels"),
      authorId: v.id("users"),
      content: v.string(),
      parentMessageId: v.optional(v.id("messages")),
      author: v.object({
        _id: v.id("users"),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
      replyCount: v.number(),
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

    const limit = args.limit ?? 50;

    // Get main messages (not replies) ordered by creation time
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .filter((q) => q.eq(q.field("parentMessageId"), undefined))
      .order("desc")
      .take(limit);

    const messagesWithAuthors = [];
    for (const message of messages.reverse()) {
      const author = await ctx.db.get(message.authorId);
      if (author) {
        // Count replies to this message
        const replies = await ctx.db
          .query("messages")
          .withIndex("by_parent_message", (q) =>
            q.eq("parentMessageId", message._id)
          )
          .collect();

        messagesWithAuthors.push({
          ...message,
          author: {
            _id: author._id,
            email: author.email,
            name: author.name,
          },
          replyCount: replies.length,
        });
      }
    }

    return messagesWithAuthors;
  },
});

/**
 * Get replies to a specific message (thread)
 */
export const getMessageReplies = query({
  args: {
    parentMessageId: v.id("messages"),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      channelId: v.id("channels"),
      authorId: v.id("users"),
      content: v.string(),
      parentMessageId: v.optional(v.id("messages")),
      author: v.object({
        _id: v.id("users"),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get the parent message to check channel access
    const parentMessage = await ctx.db.get(args.parentMessageId);
    if (!parentMessage) {
      return [];
    }

    // Check if user is a member of the channel
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", parentMessage.channelId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      return [];
    }

    const replies = await ctx.db
      .query("messages")
      .withIndex("by_parent_message", (q) =>
        q.eq("parentMessageId", args.parentMessageId)
      )
      .order("asc")
      .collect();

    const repliesWithAuthors = [];
    for (const reply of replies) {
      const author = await ctx.db.get(reply.authorId);
      if (author) {
        repliesWithAuthors.push({
          ...reply,
          author: {
            _id: author._id,
            email: author.email,
            name: author.name,
          },
        });
      }
    }

    return repliesWithAuthors;
  },
});

/**
 * Update a message (edit)
 */
export const updateMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated to edit messages");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    if (message.authorId !== userId) {
      throw new Error("You can only edit your own messages");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
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
      throw new Error("User must be authenticated to delete messages");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    if (message.authorId !== userId) {
      throw new Error("You can only delete your own messages");
    }

    // Delete all replies to this message first
    const replies = await ctx.db
      .query("messages")
      .withIndex("by_parent_message", (q) =>
        q.eq("parentMessageId", args.messageId)
      )
      .collect();

    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    // Delete the message itself
    await ctx.db.delete(args.messageId);

    return null;
  },
});

/**
 * Get a single message by ID
 */
export const getMessage = query({
  args: {
    messageId: v.id("messages"),
  },
  returns: v.union(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      channelId: v.id("channels"),
      authorId: v.id("users"),
      content: v.string(),
      parentMessageId: v.optional(v.id("messages")),
      author: v.object({
        _id: v.id("users"),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return null;
    }

    // Check if user is a member of the channel
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", message.channelId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const author = await ctx.db.get(message.authorId);
    if (!author) {
      return null;
    }

    return {
      ...message,
      author: {
        _id: author._id,
        email: author.email,
        name: author.name,
      },
    };
  },
});
