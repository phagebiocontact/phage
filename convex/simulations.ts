import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
export const createSimulation = mutation({
  args: {
    name: v.string(),
    parameters: v.object({
      temperature: v.number(),
      duration: v.number(),
      timestep: v.number(),
      ensemble: v.string(),
    }),
    equilibration: v.object({
      enabled: v.boolean(),
      time: v.optional(v.number()),
      temperature: v.optional(v.number()),
      pressure: v.optional(v.number()),
      timestep: v.optional(v.number()),
    }),
    proteinStorageId: v.id("_storage"),
    ligandStorageId: v.optional(v.id("_storage")),
    creditsUsed: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized - please sign in");
    }
    
    if (!args.name || args.name.length > 255) {
      throw new Error("Invalid simulation name");
    }

    // Get user and check credits
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentCredits = user.credits || 0;
    if (currentCredits < args.creditsUsed) {
      throw new Error(`Insufficient credits. You need ${args.creditsUsed} but have ${currentCredits}`);
    }

    // Deduct credits
    await ctx.db.patch(userId, {
      credits: currentCredits - args.creditsUsed,
    });

    // Create simulation record
    const simulationId = await ctx.db.insert("simulations", {
      userId,
      name: args.name,
      status: "pending",
      createdAt: Date.now(),
      parameters: args.parameters,
      equilibration: args.equilibration,
      creditsCost: args.creditsUsed,
      progressPercent: 0,
      proteinStorageId: args.proteinStorageId,
      ligandStorageId: args.ligandStorageId,
    });

    // Schedule job submission (will run asynchronously)
    await ctx.scheduler.runAfter(0, internal.actions.submitJob, {
      simulationId,
      proteinStorageId: args.proteinStorageId,
      ligandStorageId: args.ligandStorageId,
      config: {
        forcefield: {
          protein: "amber19",
        },
        solvent: {
          model: "tip3p",
          ionic_strength_molar: 0.15,
          padding_nm: 1.0,
        },
        nvt: {
          temperature_k: args.parameters.temperature,
          timestep_fs: args.parameters.timestep,
          time_ns: args.equilibration.enabled ? (args.equilibration.time || 0.1) : 0.1,
        },
        npt: {
          temperature_k: args.parameters.temperature,
          pressure_bar: args.equilibration.enabled ? (args.equilibration.pressure || 1.0) : 1.0,
          timestep_fs: args.parameters.timestep,
          time_ns: args.equilibration.enabled ? (args.equilibration.time || 1.0) : 1.0,
        },
        production: {
          temperature_k: args.parameters.temperature,
          pressure_bar: 1.0,
          timestep_fs: args.parameters.timestep,
          time_ns: args.parameters.duration,
        },
      },
    });

    return simulationId;
  },
});
export const getUserSimulations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return [];
    }
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
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }
    const simulation = await ctx.db.get(args.id);
    if (!simulation || simulation.userId !== userId) {
      return null;
    }
    return simulation;
  },
});

export const updateSimulationStatus = internalMutation({
  args: {
    simulationId: v.id("simulations"),
    status: v.optional(v.string()),
    modalJobId: v.optional(v.string()),
    currentStep: v.optional(v.string()),
    progressPercent: v.optional(v.number()),
    timeElapsedSeconds: v.optional(v.number()),
    details: v.optional(v.string()),
    error: v.optional(v.string()),
    resultStorageId: v.optional(v.id("_storage")),
    analysisData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { simulationId, analysisData, ...updates } = args;
    
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    // Handle analysis data merging
    if (analysisData) {
      const current = await ctx.db.get(simulationId);
      const currentAnalysisData = current?.analysisData || {};
      filteredUpdates.analysisData = {
        ...currentAnalysisData,
        ...analysisData,
      };
    }

    await ctx.db.patch(simulationId, filteredUpdates);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
