import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

import {
  requireSiteAccess,
  requireTenancyAccess,
  requireTenancyManagementAccess,
} from "./lib/authorization";

/*
 * ======================================================
 * GET TENANCIES BY SITE
 * ======================================================
 */

export const getBySite = query({
  args: {
    siteId: v.id("sites"),
  },

  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    return await ctx.db
      .query("tenancies")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .order("desc")
      .collect();
  },
});

/*
 * ======================================================
 * GET ONE TENANCY
 * ======================================================
 */

export const getById = query({
  args: {
    tenancyId: v.id("tenancies"),
  },

  handler: async (ctx, args) => {
    const access = await requireTenancyAccess(ctx, args.tenancyId);

    return {
      tenancy: access.tenancy,

      site: access.site,

      role: access.role,
    };
  },
});

/*
 * ======================================================
 * CREATE TENANCY
 * ======================================================
 */

export const create = mutation({
  args: {
    siteId: v.id("sites"),

    name: v.string(),

    contactName: v.optional(v.string()),

    contactEmail: v.optional(v.string()),

    contactPhone: v.optional(v.string()),

    floor: v.optional(v.string()),

    description: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const access = await requireTenancyManagementAccess(ctx, args.siteId);

    const name = args.name.trim();

    if (!name) {
      throw new Error("Tenancy name is required");
    }

    const now = Date.now();

    return await ctx.db.insert("tenancies", {
      companyId: access.site.companyId,

      siteId: access.site._id,

      name,

      contactName: cleanOptional(args.contactName),

      contactEmail: cleanOptional(args.contactEmail),

      contactPhone: cleanOptional(args.contactPhone),

      floor: cleanOptional(args.floor),

      description: cleanOptional(args.description),

      status: "ACTIVE",

      createdAt: now,
      updatedAt: now,
    });
  },
});

/*
 * ======================================================
 * UPDATE TENANCY
 * ======================================================
 */

export const update = mutation({
  args: {
    tenancyId: v.id("tenancies"),

    name: v.string(),

    contactName: v.optional(v.string()),

    contactEmail: v.optional(v.string()),

    contactPhone: v.optional(v.string()),

    floor: v.optional(v.string()),

    description: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const tenancy = await ctx.db.get(args.tenancyId);

    if (!tenancy) {
      throw new Error("Tenancy not found");
    }

    await requireTenancyManagementAccess(ctx, tenancy.siteId);

    const name = args.name.trim();

    if (!name) {
      throw new Error("Tenancy name is required");
    }

    await ctx.db.patch(tenancy._id, {
      name,

      contactName: cleanOptional(args.contactName),

      contactEmail: cleanOptional(args.contactEmail),

      contactPhone: cleanOptional(args.contactPhone),

      floor: cleanOptional(args.floor),

      description: cleanOptional(args.description),

      updatedAt: Date.now(),
    });

    return tenancy._id;
  },
});

/*
 * ======================================================
 * ARCHIVE / RESTORE TENANCY
 * ======================================================
 */

export const setStatus = mutation({
  args: {
    tenancyId: v.id("tenancies"),

    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),
  },

  handler: async (ctx, args) => {
    const tenancy = await ctx.db.get(args.tenancyId);

    if (!tenancy) {
      throw new Error("Tenancy not found");
    }

    await requireTenancyManagementAccess(ctx, tenancy.siteId);

    await ctx.db.patch(tenancy._id, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return tenancy._id;
  },
});

/*
 * ======================================================
 * HELPERS
 * ======================================================
 */

function cleanOptional(value?: string) {
  const trimmed = value?.trim();

  return trimmed || undefined;
}
