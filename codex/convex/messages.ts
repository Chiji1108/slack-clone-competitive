import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const MAX_MESSAGE_LENGTH = 2000;

export const list = query({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.array(
    v.object({
      id: v.id("messages"),
      authorId: v.id("users"),
      authorName: v.string(),
      body: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(100);

    const authorIds = new Set<Id<"users">>();
    for (const message of messages) {
      authorIds.add(message.authorId);
    }

    const authors = new Map<Id<"users">, { name?: string; email?: string }>();
    for (const authorId of authorIds) {
      const user = await ctx.db.get(authorId);
      if (user) {
        authors.set(authorId, { name: user.name, email: user.email });
      }
    }

    const ordered: Array<{
      id: Id<"messages">;
      authorId: Id<"users">;
      authorName: string;
      body: string;
      createdAt: number;
    }> = [];

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const author = authors.get(message.authorId);
      const candidateName = (author?.name ?? "").trim();
      const authorName = candidateName.length > 0
        ? candidateName
        : author?.email ?? "Unknown user";
      ordered.push({
        id: message._id,
        authorId: message.authorId,
        authorName,
        body: message.body,
        createdAt: message._creationTime,
      });
    }

    return ordered;
  },
});

export const send = mutation({
  args: {
    channelId: v.id("channels"),
    body: v.string(),
  },
  returns: v.object({
    id: v.id("messages"),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Must be signed in to send a message.");
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel does not exist.");
    }

    const trimmed = args.body.trim();
    if (trimmed.length === 0) {
      throw new Error("Message cannot be empty.");
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      throw new Error(
        `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      );
    }

    const id = await ctx.db.insert("messages", {
      channelId: args.channelId,
      authorId: userId,
      body: trimmed,
    });

    return { id };
  },
});
