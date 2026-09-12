import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireCompanyRole,
  requireSiteAccess,
} from "./lib/authorization";

export const assign = mutation({
  args: {
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    userId: v.id("users"),

    role: v.union(
      v.literal("AREA_MANAGER"),
      v.literal("SITE_MANAGER"),
      v.literal("SUPERVISOR"),
      v.literal("CLEANER"),
    ),
  },

  handler: async (ctx, args) => {
    // For now, only Super Admin can
    // create assignments.
    await requireCompanyRole(
      ctx,
      args.companyId,
      ["SUPER_ADMIN"],
    );

    const site = await ctx.db.get(args.siteId);

    if (!site) {
      throw new Error("Site not found");
    }

    if (site.companyId !== args.companyId) {
      throw new Error(
        "Site does not belong to this company",
      );
    }

    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    const existing = await ctx.db
      .query("siteAssignments")
      .withIndex("by_user_and_site", (q) =>
        q
          .eq("userId", args.userId)
          .eq("siteId", args.siteId),
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        status: "ACTIVE",
        updatedAt: now,
      });

      return existing._id;
    }

    return await ctx.db.insert("siteAssignments", {
      companyId: args.companyId,
      siteId: args.siteId,
      userId: args.userId,

      role: args.role,
      status: "ACTIVE",

      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listForSite = query({
  args: {
    siteId: v.id("sites"),
  },

  handler: async (ctx, args) => {
    await requireSiteAccess(
      ctx,
      args.siteId,
    );

    return await ctx.db
      .query("siteAssignments")
      .withIndex("by_site", (q) =>
        q.eq("siteId", args.siteId),
      )
      .collect();
  },
});