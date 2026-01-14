import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Schema constraint: 'todos' table does not exist.
    return [];
  },
});


export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    // Schema constraint: 'todos' table does not exist.
    // Return null or throw error depending on desired behavior. Returning null for safety.
    return null;
  },
});

export const toggle = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    // Schema constraint: 'todos' table does not exist.
    throw new Error("Todos table not available");
  },
});

export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    // Schema constraint: 'todos' table does not exist.
    return null;
  },
});
