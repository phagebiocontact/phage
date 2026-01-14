import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
export const createSimulation = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized - please sign in");
    }
    const userId = identity.subject as Id<"users">;
    if (!args.name || args.name.length > 255) {
      throw new Error("Invalid simulation name");
    }
    const simulationId = await ctx.db.insert("simulations", {
      userId,
      name: args.name,
      status: "pending",
      createdAt: Date.now(),
    });
    return simulationId;
  },
});
export const getUserSimulations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject as Id<"users">;
    return await ctx.db
      .query("simulations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
export const getSimulation = query({
  args: { id: v.id("simulations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const userId = identity.subject as Id<"users">;
    const simulation = await ctx.db.get(args.id);
    if (!simulation || simulation.userId !== userId) {
      return null;
    }
    return simulation;
  },
});
