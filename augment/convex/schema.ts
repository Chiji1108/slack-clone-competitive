import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  // Workspaces - top-level containers for channels and users
  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
  }).index("by_owner", ["ownerId"]),

  // Channels - communication channels within workspaces
  channels: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
    createdBy: v.id("users"),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_and_name", ["workspaceId", "name"]),

  // Messages - individual messages within channels
  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.id("users"),
    content: v.string(),
    parentMessageId: v.optional(v.id("messages")), // For thread replies
  })
    .index("by_channel", ["channelId"])
    .index("by_parent_message", ["parentMessageId"]),

  // Workspace members - users who belong to workspaces
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  // Channel members - users who have access to specific channels
  channelMembers: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
  })
    .index("by_channel", ["channelId"])
    .index("by_user", ["userId"])
    .index("by_channel_and_user", ["channelId", "userId"]),

  // User presence - track online/offline status
  userPresence: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    isOnline: v.boolean(),
    lastSeen: v.number(), // timestamp
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  // Keep the existing numbers table for backward compatibility
  numbers: defineTable({
    value: v.number(),
  }),
});
