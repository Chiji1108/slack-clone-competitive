import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listMessages = query({
  args: {
    channelId: v.optional(v.id("channels")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If no channel is specified (e.g., initial render), return empty list.
    const channelId = args.channelId;
    if (channelId == null) {
      return [];
    }

    // authorize: ensure user is a member of this channel
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", channelId).eq("userId", userId)
      )
      .take(1);
    if (membership.length === 0) throw new Error("Forbidden");

    const limit = args.limit ?? 50;
    const docs = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", channelId))
      .order("desc")
      .take(limit);

    // return ascending chronological order
    return docs
      .reverse()
      .map((m) => ({
        _id: m._id,
        body: m.body,
        userId: m.userId,
        authorEmail: m.authorEmail,
        _creationTime: m._creationTime,
      }));
  },
});

export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // authorize membership first
    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .take(1);
    if (membership.length === 0) throw new Error("Forbidden");

    const user = await ctx.db.get(userId);
    const authorEmail = user?.email ?? "unknown";

    const id = await ctx.db.insert("messages", {
      channelId: args.channelId,
      userId,
      body: args.body,
      authorEmail,
    });
    return { id };
  },
});