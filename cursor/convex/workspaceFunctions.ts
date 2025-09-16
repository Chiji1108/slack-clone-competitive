import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
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
      throw new Error("Not authenticated");
    }

    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      description: args.description,
      ownerId: userId,
      createdAt: Date.now(),
    });

    // Add the creator as the owner of the workspace
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId,
      role: "owner",
      joinedAt: Date.now(),
    });

    return workspaceId;
  },
});

/**
 * Get workspaces for the current user
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
      createdAt: v.number(),
      role: v.union(
        v.literal("owner"),
        v.literal("admin"),
        v.literal("member")
      ),
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

    const workspaces: Array<{
      _id: Id<"workspaces">;
      _creationTime: number;
      name: string;
      description?: string;
      ownerId: Id<"users">;
      createdAt: number;
      role: "owner" | "admin" | "member";
    }> = [];
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
 * Get workspace by ID
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
      createdAt: v.number(),
      role: v.union(
        v.literal("owner"),
        v.literal("admin"),
        v.literal("member")
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
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

    return {
      ...workspace,
      role: membership.role,
    };
  },
});

/**
 * Get workspace members
 */
export const getWorkspaceMembers = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.array(
    v.object({
      _id: v.id("workspaceMembers"),
      userId: v.id("users"),
      role: v.union(
        v.literal("owner"),
        v.literal("admin"),
        v.literal("member")
      ),
      joinedAt: v.number(),
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

    // Check if user is a member of this workspace
    const userMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!userMembership) {
      return [];
    }

    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const members: Array<{
      _id: Id<"workspaceMembers">;
      userId: Id<"users">;
      role: "owner" | "admin" | "member";
      joinedAt: number;
      user: {
        _id: Id<"users">;
        name?: string;
        email?: string;
        image?: string;
        _creationTime: number;
      };
    }> = [];
    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      if (user) {
        members.push({
          ...membership,
          user,
        });
      }
    }

    return members;
  },
});

/**
 * Invite user to workspace
 */
export const inviteUserToWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has permission to invite (owner or admin)
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      throw new Error("Insufficient permissions");
    }

    // Find user by email
    const users = await ctx.db.query("users").collect();
    const user = users.find((u) => u.email === args.email);

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", user._id)
      )
      .unique();

    if (existingMembership) {
      throw new Error("User is already a member of this workspace");
    }

    // Add user to workspace
    await ctx.db.insert("workspaceMembers", {
      workspaceId: args.workspaceId,
      userId: user._id,
      role: args.role,
      joinedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Remove user from workspace
 */
export const removeUserFromWorkspace = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has permission to remove (owner or admin)
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      throw new Error("Insufficient permissions");
    }

    // Cannot remove the owner
    if (args.userId === membership.userId && membership.role === "owner") {
      throw new Error("Cannot remove workspace owner");
    }

    // Find and remove the membership
    const userMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .unique();

    if (userMembership) {
      await ctx.db.delete(userMembership._id);
    }

    return null;
  },
});

/**
 * Update user role in workspace
 */
export const updateUserRole = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Only owner can update roles
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId)
      )
      .unique();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only workspace owner can update roles");
    }

    // Find and update the user's membership
    const userMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_and_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId)
      )
      .unique();

    if (userMembership) {
      await ctx.db.patch(userMembership._id, { role: args.role });
    }

    return null;
  },
});
