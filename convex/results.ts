import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Helper to parse CSV data from tarball
export const parseAnalysisData = mutation({
  args: {
    resultStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    try {
      // Get the tarball URL
      const url = await ctx.storage.getUrl(args.resultStorageId);
      if (!url) {
        throw new Error("Result file not found");
      }

      // Note: In a real implementation, you would:
      // 1. Download the tarball
      // 2. Extract CSV files (rmsd.csv, rmsf.csv, etc.)
      // 3. Parse the CSV data
      // 4. Return structured data
      
      // For now, return mock data structure
      return {
        rmsd: [],
        rmsf: [],
        energy: [],
        radiusOfGyration: [],
        sasa: [],
      };
    } catch (error) {
      console.error("Error parsing analysis data:", error);
      throw error;
    }
  },
});

// Generate download URL for results
export const getResultsDownloadUrl = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return url;
  },
});
