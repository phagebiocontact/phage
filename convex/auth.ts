import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { authTables } from "@convex-dev/auth/server";
import { DataModel } from "./_generated/dataModel";

export const { auth,    } = convexAuth({
  providers: [Password],
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});