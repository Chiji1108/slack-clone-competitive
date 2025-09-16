import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new workspace
 */
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("workspaces"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated to create a workspace");
    }

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      description: args.description,
      ownerId: userId,
    });

    // Add the creator as an admin member
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId,
      role: "admin",
    });

    return workspaceId;
  },
});

/**
 * Get all workspaces where the current user is a member
 */
export const getUserWorkspaces = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("workspaces"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      ownerId: v.id("users"),
      role: v.union(v.literal("admin"), v.literal("member")),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const workspaces = [];
    for (const membership of memberships) {
      const workspace = await ctx.db.get(membership.workspaceId);
      if (workspace) {
        workspaces.push({
          ...workspace,
          role: membership.role,
        });
      }
    }

    return workspaces;
  },
});

/**
 * Get workspace details by ID
 */
export const getWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.union(
    v.object({
      _id: v.id("workspaces"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      ownerId: v.id("users"),
      userRole: v.union(v.literal("admin"), v.literal("member")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Check if user is a member of this workspace
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      return null;
    }

    return {
      ...workspace,
      userRole: membership.role,
    };
  },
});

/**
 * Add a user to a workspace
 */
export const addMemberToWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userEmail: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("User must be authenticated");
    }

    // Check if current user is an admin of this workspace
    const currentUserMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", currentUserId)
      )
      .unique();

    if (!currentUserMembership || currentUserMembership.role !== "admin") {
      throw new Error("Only workspace admins can add members");
    }

    // Find user by email
    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.userEmail))
      .unique();

    if (!targetUser) {
      throw new Error("User not found");
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", targetUser._id)
      )
      .unique();

    if (existingMembership) {
      throw new Error("User is already a member of this workspace");
    }

    // Add user to workspace
    await ctx.db.insert("workspaceMembers", {
      workspaceId: args.workspaceId,
      userId: targetUser._id,
      role: args.role,
    });

    return null;
  },
});

/**
 * Get all members of a workspace
 */
export const getWorkspaceMembers = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      role: v.union(v.literal("admin"), v.literal("member")),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Check if user is a member of this workspace
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!membership) {
      return [];
    }

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const members = [];
    for (const membershipRecord of memberships) {
      const user = await ctx.db.get(membershipRecord.userId);
      if (user) {
        members.push({
          _id: user._id,
          email: user.email,
          name: user.name,
          role: membershipRecord.role,
        });
      }
    }

    return members;
  },
});
