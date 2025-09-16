import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const MAX_CHANNEL_NAME_LENGTH = 40;

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("channels"),
      name: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const docs = await ctx.db.query("channels").collect();
    docs.sort((first, second) => first.name.localeCompare(second.name));
    const formatted: Array<{ id: Id<"channels">; name: string }> = [];
    for (const channel of docs) {
      formatted.push({ id: channel._id, name: channel.name });
    }
    return formatted;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  returns: v.object({
    id: v.id("channels"),
    name: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Must be signed in to create a channel.");
    }
    const trimmed = args.name.trim();
    if (trimmed.length === 0) {
      throw new Error("Channel name is required.");
    }
    if (trimmed.length > MAX_CHANNEL_NAME_LENGTH) {
      throw new Error(
        `Channel name must be ${MAX_CHANNEL_NAME_LENGTH} characters or fewer.`,
      );
    }
    const duplicates = await ctx.db
      .query("channels")
      .withIndex("by_name", (q) => q.eq("name", trimmed))
      .take(1);
    if (duplicates.length > 0) {
      throw new Error("Channel name is already taken.");
    }
    const id = await ctx.db.insert("channels", {
      name: trimmed,
      createdBy: userId,
    });
    return { id, name: trimmed };
  },
});
