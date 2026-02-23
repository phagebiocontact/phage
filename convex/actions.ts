import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  apiSubmitJob,
  apiGetJobStatus,
  apiGetJobFile,
  apiGetJobTar,
  ARTIFACT_FILENAMES,
  type JobConfig,
  type JobStatusValue,
} from "./mdApi";

const POLL_INTERVAL_MS = 10_000;
const TERMINAL: Set<JobStatusValue> = new Set(["completed", "failed", "canceled"]);

// ─── Submit Job ───────────────────────────────────────────────────────────────
export const submitJob = internalAction({
  args: {
    simulationId: v.id("simulations"),
    proteinStorageId: v.id("_storage"),
    ligandStorageId: v.optional(v.id("_storage")),
    config: v.object({
      forcefield: v.string(),
      solvation_model: v.string(),
      ph: v.number(),
      hmr: v.boolean(),
      temperature_K: v.number(),
      pressure_bar: v.number(),
      timestep_fs: v.number(),
      equilibration_time_ns: v.number(),
      production_time_ns: v.number(),
      padding_nm: v.number(),
      ionic_strength_mol: v.number(),
      minimization_max_steps: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    try {
      const proteinUrl = await ctx.storage.getUrl(args.proteinStorageId);
      if (!proteinUrl) throw new Error("Failed to get protein file URL");

      const proteinRes = await fetch(proteinUrl);
      const proteinBytes = await proteinRes.arrayBuffer();

      let ligandBytes: ArrayBuffer | undefined;
      if (args.ligandStorageId) {
        const ligandUrl = await ctx.storage.getUrl(args.ligandStorageId);
        if (ligandUrl) {
          const ligRes = await fetch(ligandUrl);
          ligandBytes = await ligRes.arrayBuffer();
        }
      }

      const result = await apiSubmitJob(
        proteinBytes,
        args.config as JobConfig,
        ligandBytes
      );

      await ctx.runMutation(internal.simulations.updateSimulationStatus, {
        simulationId: args.simulationId,
        status: "queued",
        modalJobId: result.job_id,
        currentStep: "Queued",
        progressPercent: 0,
        details: "Job submitted to FastAPI server",
      });

      // Kick off autonomous polling
      await ctx.scheduler.runAfter(POLL_INTERVAL_MS, internal.actions.pollJobStatus, {
        simulationId: args.simulationId,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.simulations.updateSimulationStatus, {
        simulationId: args.simulationId,
        status: "failed",
        error: msg,
        errorSummary: "Failed to submit job to server.",
        errorRaw: msg,
      });
      await ctx.runMutation(internal.simulations.releaseCredits, {
        simulationId: args.simulationId,
      });
      throw error;
    }
  },
});

// ─── Autonomous Poll ──────────────────────────────────────────────────────────
export const pollJobStatus = internalAction({
  args: { simulationId: v.id("simulations") },
  handler: async (ctx, args) => {
    const simulation = await ctx.runQuery(api.simulations.getSimulation, {
      id: args.simulationId,
    });
    if (!simulation) return;
    if (TERMINAL.has(simulation.status as JobStatusValue)) return;
    if (!simulation.modalJobId) return;

    try {
      const statusData = await apiGetJobStatus(simulation.modalJobId);

      const normalizedStatus = normalizeStatus(statusData.status);

      await ctx.runMutation(internal.simulations.updateSimulationStatus, {
        simulationId: args.simulationId,
        status: normalizedStatus,
        currentStep: statusData.current_step,
        progressPercent: statusData.progress_percent,
        timeElapsedSeconds: statusData.time_elapsed_seconds,
        details: statusData.details,
        lastPolledAt: Date.now(),
        ...(statusData.error
          ? {
              error: statusData.error,
              errorSummary: extractUserFriendlyError(statusData.error),
              errorRaw: statusData.error,
              errorDetails: statusData.error_details,
            }
          : {}),
      });

      if (normalizedStatus === "completed") {
        await ctx.runAction(internal.actions.mirrorResults, {
          simulationId: args.simulationId,
        });
        return;
      }

      if (normalizedStatus === "failed" || normalizedStatus === "canceled") {
        await ctx.runMutation(internal.simulations.releaseCredits, {
          simulationId: args.simulationId,
        });
        return;
      }

      // Not terminal – reschedule
      await ctx.scheduler.runAfter(POLL_INTERVAL_MS, internal.actions.pollJobStatus, {
        simulationId: args.simulationId,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown poll error";
      await ctx.runMutation(internal.simulations.updateSimulationStatus, {
        simulationId: args.simulationId,
        error: msg,
        lastPolledAt: Date.now(),
      });
      // Still reschedule in case of transient error
      await ctx.scheduler.runAfter(POLL_INTERVAL_MS, internal.actions.pollJobStatus, {
        simulationId: args.simulationId,
      });
    }
  },
});

// ─── manual status check (used by results page "Refresh" button) ──────────────
export const checkJobStatus = action({
  args: { simulationId: v.id("simulations") },
  handler: async (ctx, args): Promise<void> => {
    await ctx.runAction(internal.actions.pollJobStatus, {
      simulationId: args.simulationId,
    });
  },
});

// ─── Mirror Results ───────────────────────────────────────────────────────────
export const mirrorResults = internalAction({
  args: { simulationId: v.id("simulations") },
  handler: async (ctx, args) => {
    const simulation = await ctx.runQuery(api.simulations.getSimulation, {
      id: args.simulationId,
    });
    if (!simulation?.modalJobId) return;

    const jobId = simulation.modalJobId;
    const artifactIds: Record<string, Id<"_storage">> = {};

    // Mirror each artifact, tolerating individual failures
    const mirrors = Object.entries(ARTIFACT_FILENAMES).map(async ([key, filename]) => {
      try {
        const bytes = await apiGetJobFile(jobId, filename);
        const blob = new Blob([bytes]);
        const storageId = await ctx.storage.store(blob);
        artifactIds[key] = storageId;
      } catch {
        // Artifact not yet available – skip
      }
    });

    // Also mirror the tarball
    const tarMirror = (async () => {
      try {
        const tarBytes = await apiGetJobTar(jobId);
        const tarBlob = new Blob([tarBytes]);
        artifactIds.resultTar = await ctx.storage.store(tarBlob);
      } catch {
        // Skip
      }
    })();

    await Promise.all([...mirrors, tarMirror]);

    // Parse CSVs if available
    const analysisData = await parseAnalysisCsvs(ctx, artifactIds);

    // Extract log tail if available
    let logTail: string | undefined;
    if (artifactIds.simulationLog) {
      try {
        const logUrl = await ctx.storage.getUrl(artifactIds.simulationLog as Id<"_storage">);
        if (logUrl) {
          const logRes = await fetch(logUrl);
          const logText = await logRes.text();
          const lines = logText.split("\n");
          logTail = lines.slice(-50).join("\n");
        }
      } catch {
        // Skip
      }
    }

    await ctx.runMutation(internal.simulations.updateSimulationStatus, {
      simulationId: args.simulationId,
      status: "completed",
      completedAt: Date.now(),
      progressPercent: 100,
      artifacts: artifactIds,
      analysisData: Object.keys(analysisData).length > 0 ? analysisData : undefined,
      ...(logTail ? { logTail } : {}),
    });

    // Capture credits
    await ctx.runMutation(internal.simulations.captureCredits, {
      simulationId: args.simulationId,
    });
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStatus(raw: string): JobStatusValue {
  const map: Record<string, JobStatusValue> = {
    pending: "pending",
    queued: "queued",
    running: "running",
    completed: "completed",
    failed: "failed",
    canceled: "canceled",
    cancelled: "canceled",
  };
  return map[raw?.toLowerCase()] ?? "running";
}

function extractUserFriendlyError(raw: string): string {
  if (!raw) return "An unknown error occurred during the simulation.";
  if (raw.toLowerCase().includes("memory")) return "The simulation ran out of memory.";
  if (raw.toLowerCase().includes("timeout")) return "The simulation timed out.";
  if (raw.toLowerCase().includes("converge")) return "The simulation failed to converge.";
  if (raw.toLowerCase().includes("pdb")) return "There was a problem with the input PDB file.";
  if (raw.toLowerCase().includes("ligand") || raw.toLowerCase().includes("sdf"))
    return "There was a problem with the input ligand file.";
  return "The simulation encountered an error. See details below.";
}

async function parseAnalysisCsvs(
  ctx: any,
  artifactIds: Record<string, Id<"_storage">>
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  const get = async (key: string): Promise<string | null> => {
    const id = artifactIds[key];
    if (!id) return null;
    try {
      const url = await ctx.storage.getUrl(id as Id<"_storage">);
      if (!url) return null;
      const res = await fetch(url);
      return res.text();
    } catch {
      return null;
    }
  };

  // RMSD
  const rmsdCsv = await get("rmsdCsv");
  if (rmsdCsv) {
    result.rmsd = parseCsv(rmsdCsv, (row, i) => ({
      frame: parseNum(row.frame ?? row.Frame ?? String(i)),
      time: parseNum(row.time ?? row.Time ?? row["#Time"] ?? String(i)),
      value: parseNum(row.rmsd ?? row.RMSD ?? row.value ?? "0"),
    })).filter((r) => !isNaN(r.value));
  }

  // RMSF
  const rmsfCsv = await get("rmsfCsv");
  if (rmsfCsv) {
    result.rmsf = parseCsv(rmsfCsv, (row, i) => ({
      residue: parseNum(row.residue ?? row.Residue ?? row.resid ?? String(i)),
      value: parseNum(row.rmsf ?? row.RMSF ?? row.value ?? "0"),
    })).filter((r) => !isNaN(r.value));
  }

  // Radius of Gyration
  const rgCsv = await get("rgCsv");
  if (rgCsv) {
    result.rg = parseCsv(rgCsv, (row, i) => ({
      frame: parseNum(row.frame ?? row.Frame ?? String(i)),
      time: parseNum(row.time ?? row.Time ?? row["#Time"] ?? String(i)),
      value: parseNum(row.rg ?? row.Rg ?? row.value ?? "0"),
    })).filter((r) => !isNaN(r.value));
  }

  // Energy
  const energyCsv = await get("energyCsv");
  if (energyCsv) {
    result.energy = parseCsv(energyCsv, (row, i) => ({
      frame: parseNum(row.frame ?? row.Frame ?? String(i)),
      time: parseNum(row.time ?? row.Time ?? row["#Time"] ?? row["Time (ps)"] ?? String(i)),
      potential: parseNum(row.potential ?? row.Potential ?? row.potential_energy ?? row["Potential Energy (kJ/mole)"] ?? "0"),
      kinetic: parseNum(row.kinetic ?? row.Kinetic ?? row.kinetic_energy ?? row["Kinetic Energy (kJ/mole)"] ?? "0"),
      total: parseNum(row.total ?? row.Total ?? row.total_energy ?? row["Total Energy (kJ/mole)"] ?? "0"),
    })).filter((r) => !isNaN(r.potential));
  }

  // Secondary Structure
  const ssCsv = await get("ssCsv");
  if (ssCsv) {
    result.ss = parseCsv(ssCsv, (row, i) => ({
      frame: parseNum(row.frame ?? row.Frame ?? String(i)),
      helix: parseNum(row.helix ?? row.Helix ?? row.H ?? "0"),
      sheet: parseNum(row.sheet ?? row.Sheet ?? row.E ?? "0"),
      coil: parseNum(row.coil ?? row.Coil ?? row.C ?? "0"),
    })).filter((r) => !isNaN(r.frame));
  }

  return result;
}

function parseCsv<T>(
  csv: string,
  mapper: (row: Record<string, string>, index: number) => T
): T[] {
  const lines = csv.trim().split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  return lines.slice(1).map((line, i) => {
    const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    return mapper(row, i);
  });
}

function parseNum(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}
