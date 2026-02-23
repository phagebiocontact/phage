import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const getResultsDownloadUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return ctx.storage.getUrl(args.storageId);
  },
});

export const getArtifactUrl = query({
  args: {
    simulationId: v.id("simulations"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const simulation = await ctx.db.get(args.simulationId);
    if (!simulation || simulation.userId !== userId) return null;
    return ctx.storage.getUrl(args.storageId);
  },
});
