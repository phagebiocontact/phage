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
    status: v.string(), // "pending", "queued", "running", "completed", "failed"
    createdAt: v.number(),
    parameters: v.object({
      temperature: v.number(),
      duration: v.number(),
      timestep: v.number(),
      ensemble: v.string(),
    }),
    equilibration: v.optional(v.object({
      enabled: v.boolean(),
      time: v.optional(v.number()),
      temperature: v.optional(v.number()),
      pressure: v.optional(v.number()),
      timestep: v.optional(v.number()),
    })),
    modalJobId: v.optional(v.string()),
    proteinStorageId: v.optional(v.id("_storage")),
    ligandStorageId: v.optional(v.id("_storage")),
    resultStorageId: v.optional(v.id("_storage")),
    creditsCost: v.number(),
    currentStep: v.optional(v.string()),
    progressPercent: v.optional(v.number()),
    timeElapsedSeconds: v.optional(v.number()),
    details: v.optional(v.string()),
    error: v.optional(v.string()),
    analysisData: v.optional(v.object({
      rmsd: v.optional(v.array(v.object({
        time: v.number(),
        value: v.number(),
      }))),
      rmsf: v.optional(v.array(v.object({
        residue: v.number(),
        value: v.number(),
      }))),
      radiusOfGyration: v.optional(v.array(v.object({
        time: v.number(),
        value: v.number(),
      }))),
      sasa: v.optional(v.array(v.object({
        time: v.number(),
        value: v.number(),
      }))),
    })),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"]),
  transactions: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    credits: v.number(),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
