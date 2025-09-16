import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_NAME_LENGTH = 60;

export const viewer = query({
  args: {},
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    displayName: v.string(),
    hasCustomName: v.boolean(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated.");
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found.");
    }
    const rawName = (user.name ?? "").trim();
    const email = user.email ?? "";
    const displayName = rawName.length > 0 ? rawName : email;
    return {
      userId,
      email,
      displayName: displayName.length > 0 ? displayName : "Anonymous",
      hasCustomName: rawName.length > 0,
    };
  },
});

export const setName = mutation({
  args: {
    name: v.string(),
  },
  returns: v.object({
    displayName: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated.");
    }
    const trimmed = args.name.trim();
    if (trimmed.length === 0) {
      throw new Error("Display name is required.");
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      throw new Error(
        `Display name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      );
    }
    await ctx.db.patch(userId, { name: trimmed });
    return { displayName: trimmed };
  },
});
