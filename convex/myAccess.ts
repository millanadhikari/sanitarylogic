import { query } from "./_generated/server";
import { requireUser } from "./lib/authorization";

export const getCurrentUser = query({
  args: {},

  handler: async (ctx) => {
    return await requireUser(ctx);
  },
});