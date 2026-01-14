import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    credits: v.optional(v.number()),
  }).index("by_email", ["email"]),
  simulations: defineTable({
    userId: v.id("users"),
    name: v.string(),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  transactions: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    credits: v.number(),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
