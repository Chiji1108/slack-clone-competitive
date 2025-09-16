import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  // Workspaces table
  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  // Workspace members table
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  // Channels table
  channels: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
    isPrivate: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_and_name", ["workspaceId", "name"]),

  // Channel members table
  channelMembers: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_channel", ["channelId"])
    .index("by_user", ["userId"])
    .index("by_channel_and_user", ["channelId", "userId"]),

  // Messages table
  messages: defineTable({
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
  })
    .index("by_channel", ["channelId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_author", ["authorId"])
    .index("by_channel_and_created", ["channelId", "createdAt"])
    .index("by_workspace_and_created", ["workspaceId", "createdAt"]),

  // Direct messages table
  directMessages: defineTable({
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
  })
    .index("by_sender", ["senderId"])
    .index("by_receiver", ["receiverId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_participants", ["senderId", "receiverId"])
    .index("by_participants_and_created", [
      "senderId",
      "receiverId",
      "createdAt",
    ]),

  // User presence table
  userPresence: defineTable({
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    status: v.union(
      v.literal("online"),
      v.literal("away"),
      v.literal("busy"),
      v.literal("offline")
    ),
    lastSeen: v.number(),
    customStatus: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_user_and_workspace", ["userId", "workspaceId"]),

  // Message reactions table
  messageReactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_user", ["userId"])
    .index("by_message_and_user", ["messageId", "userId"]),

  // Threads table
  threads: defineTable({
    parentMessageId: v.id("messages"),
    channelId: v.id("channels"),
    workspaceId: v.id("workspaces"),
    replyCount: v.number(),
    lastReplyAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_parent_message", ["parentMessageId"])
    .index("by_channel", ["channelId"])
    .index("by_workspace", ["workspaceId"]),

  // Numbers table (for demo purposes)
  numbers: defineTable({
    value: v.number(),
  }),
});
