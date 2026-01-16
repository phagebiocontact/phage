import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Submit job to Modal API
export const submitJob = internalAction({
  args: {
    simulationId: v.id("simulations"),
    proteinStorageId: v.id("_storage"),
    ligandStorageId: v.optional(v.id("_storage")),
    config: v.object({
      forcefield: v.object({
        protein: v.string(),
      }),
      solvent: v.object({
        model: v.string(),
        ionic_strength_molar: v.number(),
        padding_nm: v.number(),
      }),
      nvt: v.object({
        temperature_k: v.number(),
        timestep_fs: v.number(),
        time_ns: v.number(),
      }),
      npt: v.object({
        temperature_k: v.number(),
        pressure_bar: v.number(),
        timestep_fs: v.number(),
        time_ns: v.number(),
      }),
      production: v.object({
        temperature_k: v.number(),
        pressure_bar: v.number(),
        timestep_fs: v.number(),
        time_ns: v.number(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    try {
      // Get file URLs from storage
      const proteinUrl = await ctx.storage.getUrl(args.proteinStorageId);
      const ligandUrl = args.ligandStorageId
        ? await ctx.storage.getUrl(args.ligandStorageId)
        : null;

      if (!proteinUrl) {
        throw new Error("Failed to get protein file URL");
      }

      // Download files
      const proteinResponse = await fetch(proteinUrl);
      const proteinBlob = await proteinResponse.blob();
      const proteinBytes = await proteinBlob.arrayBuffer();

      let ligandBytes: ArrayBuffer | null = null;
      if (ligandUrl) {
        const ligandResponse = await fetch(ligandUrl);
        const ligandBlob = await ligandResponse.blob();
        ligandBytes = await ligandBlob.arrayBuffer();
      }

      // Prepare FormData for Modal API
      const formData = new FormData();
      formData.append("protein", new Blob([proteinBytes]), "protein.pdb");
      if (ligandBytes) {
        formData.append("ligand", new Blob([ligandBytes]), "ligand.sdf");
      }
      formData.append(
        "config",
        new Blob([JSON.stringify(args.config)], { type: "application/json" }),
        "config.json"
      );

      // Submit to Modal API
      const modalApiUrl = process.env.MODAL_API_URL || "https://greenrace66--md-fapi.modal.run";
      const response = await fetch(
        `${modalApiUrl}/jobs`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Modal API error: ${response.statusText}`);
      }

      const result = await response.json();
      const jobId = result.job_id;

      // Update simulation with Modal job ID
      await ctx.runMutation(internal.simulations.updateSimulationStatus, {
        simulationId: args.simulationId,
        status: "queued",
        modalJobId: jobId,
        currentStep: "Queued",
        progressPercent: 0,
        details: "Job submitted to Modal API",
      });

      return { success: true, jobId };
    } catch (error) {
      await ctx.runMutation(internal.simulations.updateSimulationStatus, {
        simulationId: args.simulationId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to submit job to Modal API",
      });
      throw error;
    }
  },
});

// Check job status from Modal API
export const checkJobStatus = action({
  args: {
    simulationId: v.id("simulations"),
  },
  handler: async (ctx, args) => {
    const simulation = await ctx.runQuery(api.simulations.getSimulation, {
      id: args.simulationId,
    });

    if (!simulation || !simulation.modalJobId) {
      throw new Error("Simulation not found or no Modal job ID");
    }

    try {
      const modalApiUrl = process.env.MODAL_API_URL || "https://greenrace66--md-fapi.modal.run";
      const response = await fetch(
        `${modalApiUrl}/jobs/${simulation.modalJobId}/status`
      );

      if (!response.ok) {
        throw new Error(`Modal API error: ${response.statusText}`);
      }

      const statusData = await response.json();

      // Update simulation status
      await ctx.runMutation(internal.simulations.updateSimulationStatus, {
        simulationId: args.simulationId,
        status: statusData.status,
        currentStep: statusData.current_step,
        progressPercent: statusData.progress_percent,
        timeElapsedSeconds: statusData.time_elapsed_seconds,
        details: statusData.details,
        error: statusData.error,
        analysisData: statusData.analysis_data,
      });

      // If completed, download results
      if (statusData.status === "completed") {
        await ctx.runAction(internal.actions.downloadResults, {
          simulationId: args.simulationId,
        });
      }

      return statusData;
    } catch (error) {
      await ctx.runMutation(internal.simulations.updateSimulationStatus, {
        simulationId: args.simulationId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to check job status",
      });
      throw error;
    }
  },
});

// Download results from Modal API
export const downloadResults = internalAction({
  args: {
    simulationId: v.id("simulations"),
  },
  handler: async (ctx, args) => {
    const simulation = await ctx.runQuery(api.simulations.getSimulation, {
      id: args.simulationId,
    });

    if (!simulation || !simulation.modalJobId) {
      throw new Error("Simulation not found or no Modal job ID");
    }

    try {
      const modalApiUrl = process.env.MODAL_API_URL || "https://greenrace66--md-fapi.modal.run";
      const response = await fetch(
        `${modalApiUrl}/jobs/${simulation.modalJobId}/tar`
      );

      if (!response.ok) {
        throw new Error(`Modal API error: ${response.statusText}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // Store tarball in Convex storage
      const storageId = await ctx.storage.store(blob);

      // Update simulation with result storage ID
      await ctx.runMutation(internal.simulations.updateSimulationStatus, {
        simulationId: args.simulationId,
        resultStorageId: storageId,
        details: "Results downloaded and stored",
      });

      return { success: true, storageId };
    } catch (error) {
      await ctx.runMutation(internal.simulations.updateSimulationStatus, {
        simulationId: args.simulationId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        details: "Failed to download results",
      });
      throw error;
    }
  },
});
