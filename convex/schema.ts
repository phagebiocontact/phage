import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const simulationStatus = v.union(
  v.literal("pending"),
  v.literal("queued"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("canceled")
);

const artifactsSchema = v.object({
  structurePdb: v.optional(v.id("_storage")),
  trajectoryXtc: v.optional(v.id("_storage")),
  simulationLog: v.optional(v.id("_storage")),
  resultTar: v.optional(v.id("_storage")),
  rmsdCsv: v.optional(v.id("_storage")),
  rmsfCsv: v.optional(v.id("_storage")),
  ssCsv: v.optional(v.id("_storage")),
  rgCsv: v.optional(v.id("_storage")),
  energyCsv: v.optional(v.id("_storage")),
  rmsdPng: v.optional(v.id("_storage")),
  rmsfPng: v.optional(v.id("_storage")),
  ssPng: v.optional(v.id("_storage")),
  rgPng: v.optional(v.id("_storage")),
  energyPng: v.optional(v.id("_storage")),
});

const analysisDataSchema = v.object({
  rmsd: v.optional(
    v.array(v.object({ frame: v.number(), time: v.number(), value: v.number() }))
  ),
  rmsf: v.optional(
    v.array(v.object({ residue: v.number(), value: v.number() }))
  ),
  rg: v.optional(
    v.array(v.object({ frame: v.number(), time: v.number(), value: v.number() }))
  ),
  energy: v.optional(
    v.array(
      v.object({
        frame: v.number(),
        time: v.number(),
        potential: v.number(),
        kinetic: v.number(),
        total: v.number(),
      })
    )
  ),
  ss: v.optional(
    v.array(
      v.object({
        frame: v.number(),
        helix: v.number(),
        sheet: v.number(),
        coil: v.number(),
      })
    )
  ),
});

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    credits: v.optional(v.number()),
    reservedCredits: v.optional(v.number()),
  }).index("by_email", ["email"]),
  simulations: defineTable({
    userId: v.id("users"),
    name: v.string(),
    status: simulationStatus,
    createdAt: v.number(),
    statusUpdatedAt: v.optional(v.number()),
    lastPolledAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
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
    modalJobId: v.optional(v.string()),
    proteinStorageId: v.optional(v.id("_storage")),
    ligandStorageId: v.optional(v.id("_storage")),
    creditsReserved: v.number(),
    creditsCaptured: v.optional(v.number()),
    currentStep: v.optional(v.string()),
    progressPercent: v.optional(v.number()),
    timeElapsedSeconds: v.optional(v.number()),
    details: v.optional(v.string()),
    error: v.optional(v.string()),
    errorSummary: v.optional(v.string()),
    errorRaw: v.optional(v.string()),
    errorDetails: v.optional(v.string()),
    logTail: v.optional(v.string()),
    artifacts: v.optional(artifactsSchema),
    analysisData: v.optional(analysisDataSchema),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
  transactions: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    credits: v.number(),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
