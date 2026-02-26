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

      // Polling is manual fallback only; completion should arrive via webhook.
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

    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown poll error";
      await ctx.runMutation(internal.simulations.updateSimulationStatus, {
        simulationId: args.simulationId,
        error: msg,
        lastPolledAt: Date.now(),
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

export const handleSimulationWebhook = action({
  args: {
    jobId: v.string(),
    status: v.string(),
    currentStep: v.optional(v.string()),
    progressPercent: v.optional(v.number()),
    timeElapsedSeconds: v.optional(v.number()),
    details: v.optional(v.string()),
    error: v.optional(v.string()),
    errorDetails: v.optional(v.string()),
    _callback_url: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ accepted: boolean; reason?: string }> => {
    const simulation = await ctx.runQuery(internal.simulations.getSimulationByModalJobId, {
      modalJobId: args.jobId,
    });
    if (!simulation) {
      return { accepted: false, reason: "simulation_not_found" };
    }
    if (TERMINAL.has(simulation.status as JobStatusValue)) {
      return { accepted: true, reason: "already_terminal" };
    }

    const normalizedStatus = normalizeStatus(args.status);

    await ctx.runMutation(internal.simulations.updateSimulationStatus, {
      simulationId: simulation._id,
      status: normalizedStatus,
      currentStep: args.currentStep,
      progressPercent: args.progressPercent,
      timeElapsedSeconds: args.timeElapsedSeconds,
      details: args.details,
      lastPolledAt: Date.now(),
      ...(args.error
        ? {
          error: args.error,
          errorSummary: extractUserFriendlyError(args.error),
          errorRaw: args.error,
          errorDetails: args.errorDetails,
        }
        : {}),
    });

    if (normalizedStatus === "completed") {
      // Pass callback URL to mirrorResults so it can notify Modal when done
      await ctx.runAction(internal.actions.mirrorResults, {
        simulationId: simulation._id,
        callbackUrl: args._callback_url,
      });
      return { accepted: true };
    }

    if (normalizedStatus === "failed" || normalizedStatus === "canceled") {
      await ctx.runMutation(internal.simulations.releaseCredits, {
        simulationId: simulation._id,
      });
    }

    return { accepted: true };
  },
});

// ─── Mirror Results ───────────────────────────────────────────────────────────
export const mirrorResults = internalAction({
  args: {
    simulationId: v.id("simulations"),
    callbackUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const simulation = await ctx.runQuery(api.simulations.getSimulation, {
      id: args.simulationId,
    });
    if (!simulation?.modalJobId) return;

    const jobId = simulation.modalJobId;
    const artifactIds: Record<string, Id<"_storage">> = {};

    // Mirror each artifact - track successes and failures for debugging
    const mirrorResults: Array<{ key: string; filename: string; success: boolean; error?: string }> = [];

    for (const [key, filename] of Object.entries(ARTIFACT_FILENAMES)) {
      try {
        const bytes = await apiGetJobFile(jobId, filename);
        const blob = new Blob([bytes]);
        const storageId = await ctx.storage.store(blob);
        artifactIds[key] = storageId;
        mirrorResults.push({ key, filename, success: true });
        console.log(`[mirror] Success: ${filename}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        mirrorResults.push({ key, filename, success: false, error: errorMsg });
        console.warn(`[mirror] Failed to download ${filename}: ${errorMsg}`);
      }
    }

    // Also mirror the tarball
    try {
      const tarBytes = await apiGetJobTar(jobId);
      const tarBlob = new Blob([tarBytes]);
      artifactIds.resultTar = await ctx.storage.store(tarBlob);
      console.log("[mirror] Success: md.tar.gz");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[mirror] Failed to download md.tar.gz: ${errorMsg}`);
    }

    // Log summary of what was mirrored
    const successful = mirrorResults.filter(r => r.success).map(r => r.filename);
    const failed = mirrorResults.filter(r => !r.success).map(r => `${r.filename}: ${r.error}`);
    console.log(`[mirror] Summary - Success: ${successful.length}, Failed: ${failed.length}`);
    if (failed.length > 0) {
      console.warn("[mirror] Failed files:", failed);
    }

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

    // Call back Modal to notify that mirroring is complete
    if (args.callbackUrl) {
      try {
        await fetch(args.callbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        // Callback is best-effort, ignore failures
      }
    }
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStatus(raw: string): JobStatusValue {
  const map: Record<string, JobStatusValue> = {
    pending: "pending",
    queued: "queued",
    running: "running",
    complete: "completed",
    completed: "completed",
    success: "completed",
    succeeded: "completed",
    successful: "completed",
    done: "completed",
    finished: "completed",
    finish: "completed",
    error: "failed",
    failed: "failed",
    failure: "failed",
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
      value: parseNum(row.rg ?? row.Rg ?? row["Radius of gyration"] ?? row.value ?? "0"),
    })).filter((r) => !isNaN(r.value));
  }

  // Energy
  const energyCsv = await get("energyCsv");
  if (energyCsv) {
    result.energy = parseCsv(energyCsv, (row, i) => {
      const psTime = parseNum(row.time ?? row.Time ?? row["#Time"] ?? row["Time (ps)"] ?? String(i));
      return {
        frame: parseNum(row.frame ?? row.Frame ?? String(i)),
        time: psTime / 1000.0, // OpenMM exports time in ps, so convert to ns
        potential: parseNum(row.potential ?? row.Potential ?? row.potential_energy ?? row["Potential Energy (kJ/mole)"] ?? "0"),
        kinetic: parseNum(row.kinetic ?? row.Kinetic ?? row.kinetic_energy ?? row["Kinetic Energy (kJ/mole)"] ?? "0"),
        total: parseNum(row.total ?? row.Total ?? row.total_energy ?? row["Total Energy (kJ/mole)"] ?? "0"),
      };
    }).filter((r) => !isNaN(r.potential));
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

  // SASA
  const sasaCsv = await get("sasaCsv");
  if (sasaCsv) {
    result.sasa = parseCsv(sasaCsv, (row, i) => ({
      frame: parseNum(row.frame ?? row.Frame ?? String(i)),
      time: parseNum(row.time ?? row.Time ?? row["#Time"] ?? String(i)),
      value: parseNum(row.value ?? row.sasa ?? row["Total SASA"] ?? row.SASA ?? "0"),
    })).filter((r) => !isNaN(r.value));
  }

  return result;
}

function parseCsv<T>(
  csv: string,
  mapper: (row: Record<string, string>, index: number) => T
): T[] {
  const lines = csv.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  // OpenMM prefixes its header with '#' — strip it rather than filtering the line out
  const rawHeader = lines[0].startsWith("#") ? lines[0].slice(1) : lines[0];
  const headers = rawHeader.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  // Skip subsequent comment lines (non-header #-lines) but keep data rows
  const dataLines = lines.slice(1).filter((l) => !l.trim().startsWith("#"));
  return dataLines.map((line, i) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
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
