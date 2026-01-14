import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const submitContactForm = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Schema constraint: 'contactMessages' table does not exist.
    // Logging to console instead of persisting to DB.
    console.log("Contact form submission received:", {
      name: args.name,
      email: args.email,
      subject: args.subject,
      message: args.message,
      createdAt: Date.now(),
    });
    
    // Return a dummy ID or null since we aren't inserting
    return null;
  },
});

export const getContactMessages = query({
  args: {},
  handler: async (_ctx) => {
    // Schema constraint: 'contactMessages' table does not exist.
    return [];
  },
});
