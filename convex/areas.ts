import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

import {
  requireTenancyAccess,
  requireTenancyManagementAccess,
} from "./lib/authorization";

function cleanOptional(value?: string) {
  const cleaned = value?.trim();

  return cleaned || undefined;
}

export const getByTenancy = query({
  args: {
    tenancyId: v.id("tenancies"),
  },

  handler: async (ctx, args) => {
    await requireTenancyAccess(ctx, args.tenancyId);

    return await ctx.db
      .query("areas")
      .withIndex("by_tenancy", (q) => q.eq("tenancyId", args.tenancyId))
      .collect();
  },
});

export const create = mutation({
  args: {
    tenancyId: v.id("tenancies"),

    name: v.string(),

    areaType: v.optional(v.string()),

    floor: v.optional(v.string()),

    description: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const tenancy = await ctx.db.get(args.tenancyId);

    if (!tenancy) {
      throw new Error("Tenancy not found");
    }

    await requireTenancyManagementAccess(ctx, tenancy.siteId);

    const now = Date.now();

    return await ctx.db.insert("areas", {
      companyId: tenancy.companyId,

      siteId: tenancy.siteId,

      tenancyId: tenancy._id,

      name: args.name.trim(),

      areaType: cleanOptional(args.areaType),
      floor: cleanOptional(args.floor),

      description: cleanOptional(args.description),

      status: "ACTIVE",

      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    areaId: v.id("areas"),

    name: v.string(),

    areaType: v.optional(v.string()),

    floor: v.optional(v.string()),

    description: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const area = await ctx.db.get(args.areaId);

    if (!area) {
      throw new Error("Area not found");
    }

    await requireTenancyManagementAccess(ctx, area.siteId);

    await ctx.db.patch(area._id, {
      name: args.name.trim(),

      areaType: cleanOptional(args.areaType),
      floor: cleanOptional(args.floor),

      description: cleanOptional(args.description),

      updatedAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: {
    areaId: v.id("areas"),

    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),
  },

  handler: async (ctx, args) => {
    const area = await ctx.db.get(args.areaId);

    if (!area) {
      throw new Error("Area not found");
    }

    await requireTenancyManagementAccess(ctx, area.siteId);

    await ctx.db.patch(area._id, {
      status: args.status,

      updatedAt: Date.now(),
    });
  },
});
