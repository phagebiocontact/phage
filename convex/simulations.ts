import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

export const createSimulation = mutation({
  args: {
    name: v.string(),
    parameters: v.object({
      temperature: v.number(),
      pressure: v.number(),
      duration: v.number(),
      timestep: v.number(),
      ensemble: v.string(),
      forcefield: v.string(),
      solvationModel: v.string(),
      ph: v.number(),
      hmr: v.boolean(),
      padding: v.number(),
      ionicStrength: v.number(),
      minimizationSteps: v.number(),
    }),
    equilibration: v.object({
      time: v.number(),
    }),
    proteinStorageId: v.id("_storage"),
    ligandStorageId: v.optional(v.id("_storage")),
    creditsToReserve: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized - please sign in");
    if (!args.name || args.name.length > 255) throw new Error("Invalid simulation name");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const available = (user.credits ?? 0) - (user.reservedCredits ?? 0);
    if (available < args.creditsToReserve) {
      throw new Error(
        `Insufficient credits. Available: ${available}, Required: ${args.creditsToReserve}`
      );
    }

    // Reserve credits
    await ctx.db.patch(userId, {
      reservedCredits: (user.reservedCredits ?? 0) + args.creditsToReserve,
    });

    const simulationId = await ctx.db.insert("simulations", {
      userId,
      name: args.name,
      status: "pending",
      createdAt: Date.now(),
      parameters: args.parameters,
      equilibration: args.equilibration,
      creditsReserved: args.creditsToReserve,
      progressPercent: 0,
      proteinStorageId: args.proteinStorageId,
      ligandStorageId: args.ligandStorageId,
    });

    await ctx.scheduler.runAfter(0, internal.actions.submitJob, {
      simulationId,
      proteinStorageId: args.proteinStorageId,
      ligandStorageId: args.ligandStorageId,
      config: {
        forcefield: args.parameters.forcefield,
        solvation_model: args.parameters.solvationModel,
        ph: args.parameters.ph,
        hmr: args.parameters.hmr,
        temperature_K: args.parameters.temperature,
        pressure_bar: args.parameters.pressure,
        timestep_fs: args.parameters.timestep,
        equilibration_time_ns: args.equilibration.time,
        production_time_ns: args.parameters.duration,
        padding_nm: args.parameters.padding,
        ionic_strength_mol: args.parameters.ionicStrength,
        minimization_max_steps: args.parameters.minimizationSteps,
      },
    });

    return simulationId;
  },
});

export const getUserSimulations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
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
    if (!userId) return null;
    const simulation = await ctx.db.get(args.id);
    if (!simulation || simulation.userId !== userId) return null;
    return simulation;
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

export const getSimulationByModalJobId = internalQuery({
  args: { modalJobId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("simulations")
      .filter((q) => q.eq(q.field("modalJobId"), args.modalJobId))
      .first();
  },
});

export const updateSimulationStatus = internalMutation({
  args: {
    simulationId: v.id("simulations"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("queued"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("canceled")
      )
    ),
    modalJobId: v.optional(v.string()),
    currentStep: v.optional(v.string()),
    progressPercent: v.optional(v.number()),
    timeElapsedSeconds: v.optional(v.number()),
    details: v.optional(v.string()),
    error: v.optional(v.string()),
    errorSummary: v.optional(v.string()),
    errorRaw: v.optional(v.string()),
    errorDetails: v.optional(v.string()),
    logTail: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    lastPolledAt: v.optional(v.number()),
    artifacts: v.optional(v.any()),
    analysisData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { simulationId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (filtered.status) {
      filtered.statusUpdatedAt = Date.now();
    }
    await ctx.db.patch(simulationId, filtered);
  },
});

export const captureCredits = internalMutation({
  args: { simulationId: v.id("simulations") },
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim || sim.creditsCaptured != null) return; // idempotent
    const user = await ctx.db.get(sim.userId);
    if (!user) return;
    const reserved = sim.creditsReserved;
    await ctx.db.patch(sim.userId, {
      credits: Math.max(0, (user.credits ?? 0) - reserved),
      reservedCredits: Math.max(0, (user.reservedCredits ?? 0) - reserved),
    });
    await ctx.db.patch(args.simulationId, { creditsCaptured: reserved });
    await ctx.db.insert("transactions", {
      userId: sim.userId,
      amount: reserved / 10,
      credits: reserved,
      status: "captured",
      createdAt: Date.now(),
    });
  },
});

export const releaseCredits = internalMutation({
  args: { simulationId: v.id("simulations") },
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim || sim.creditsCaptured != null) return; // already captured, nothing to release
    const user = await ctx.db.get(sim.userId);
    if (!user) return;
    await ctx.db.patch(sim.userId, {
      reservedCredits: Math.max(0, (user.reservedCredits ?? 0) - sim.creditsReserved),
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
