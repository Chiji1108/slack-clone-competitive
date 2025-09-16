import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  // Slack-like entities
  channels: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
    isDefault: v.boolean(),
  })
    .index("by_name", ["name"])
    .index("by_creator", ["createdBy"]),
  channelMembers: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
  })
    .index("by_user", ["userId"])
    .index("by_channel", ["channelId"]) 
    .index("by_channel_user", ["channelId", "userId"]),
  messages: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    body: v.string(),
    authorEmail: v.string(), // denormalized for convenience
  }).index("by_channel", ["channelId"]),

  // Keep existing example table
  numbers: defineTable({
    value: v.number(),
  }),
});
