import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const ensureOnboarded = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Ensure a default #general channel exists
    const [existingGeneral] = await ctx.db
      .query("channels")
      .withIndex("by_name", (q) => q.eq("name", "general"))
      .take(1);

    const generalId =
      existingGeneral?._id ??
      (await ctx.db.insert("channels", {
        name: "general",
        createdBy: userId,
        isDefault: true,
      }));

    // Ensure the current user is a member of #general
    const alreadyMember = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", generalId).eq("userId", userId)
      )
      .take(1);

    if (alreadyMember.length === 0) {
      await ctx.db.insert("channelMembers", { channelId: generalId, userId });
    }

    return { generalId };
  },
});

export const listMyChannels = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const channels = (
      await Promise.all(
        memberships.map((m) => ctx.db.get(m.channelId))
      )
    ).filter((c): c is NonNullable<typeof c> => c != null);

    // Sort default channels first, then by name
    channels.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    return channels.map((c) => ({ _id: c._id, name: c.name, isDefault: c.isDefault }));
  },
});

export const createChannel = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const name = args.name.trim().toLowerCase().replace(/\s+/g, "-");
    if (name.length === 0) throw new Error("Channel name cannot be empty");

    const [existing] = await ctx.db
      .query("channels")
      .withIndex("by_name", (q) => q.eq("name", name))
      .take(1);

    const channelId =
      existing?._id ??
      (await ctx.db.insert("channels", {
        name,
        createdBy: userId,
        isDefault: false,
      }));

    // Ensure creator is a member
    const alreadyMember = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", channelId).eq("userId", userId)
      )
      .take(1);
    if (alreadyMember.length === 0) {
      await ctx.db.insert("channelMembers", { channelId, userId });
    }

    return { channelId };
  },
});

export const joinChannel = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    const alreadyMember = await ctx.db
      .query("channelMembers")
      .withIndex("by_channel_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", userId)
      )
      .take(1);
    if (alreadyMember.length === 0) {
      await ctx.db.insert("channelMembers", { channelId: args.channelId, userId });
    }

    return { ok: true };
  },
});