import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireCompanyRole,
  requireSiteAccess,
  requireUser,
} from "./lib/authorization";

export const getMySites = query({
  args: {},

  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const companyMembership = await ctx.db
      .query("companyMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!companyMembership) {
      return [];
    }

    // Super Admin can see every site in the company.
    if (companyMembership.role === "SUPER_ADMIN") {
      return await ctx.db
        .query("sites")
        .withIndex("by_company", (q) =>
          q.eq("companyId", companyMembership.companyId),
        )
        .collect();
    }

    // Area managers/site-based users only see assigned sites.
    const assignments = await ctx.db
      .query("siteAssignments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeAssignments = assignments.filter(
      (assignment) => assignment.status === "ACTIVE",
    );

    const sites = await Promise.all(
      activeAssignments.map((assignment) =>
        ctx.db.get(assignment.siteId),
      ),
    );

    return sites.filter((site) => site !== null);
  },
});

export const getById = query({
  args: {
    siteId: v.id("sites"),
  },

  handler: async (ctx, args) => {
    const { site, role } = await requireSiteAccess(
      ctx,
      args.siteId,
    );

    return {
      site,
      role,
    };
  },
});

export const create = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    code: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    await requireCompanyRole(
      ctx,
      args.companyId,
      ["SUPER_ADMIN"],
    );

    const name = args.name.trim();

    if (!name) {
      throw new Error("Site name is required");
    }

    const now = Date.now();

    return await ctx.db.insert("sites", {
      companyId: args.companyId,
      name,
      code: args.code?.trim() || undefined,
      address: args.address?.trim() || undefined,
      suburb: args.suburb?.trim() || undefined,
      state: args.state?.trim() || undefined,
      postcode: args.postcode?.trim() || undefined,
      country: args.country?.trim() || undefined,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.string(),
    code: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const { site } = await requireSiteAccess(
      ctx,
      args.siteId,
    );

    await requireCompanyRole(
      ctx,
      site.companyId,
      ["SUPER_ADMIN"],
    );

    const name = args.name.trim();

    if (!name) {
      throw new Error("Site name is required");
    }

    await ctx.db.patch(args.siteId, {
      name,
      code: args.code?.trim() || undefined,
      address: args.address?.trim() || undefined,
      suburb: args.suburb?.trim() || undefined,
      state: args.state?.trim() || undefined,
      postcode: args.postcode?.trim() || undefined,
      country: args.country?.trim() || undefined,
      updatedAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: {
    siteId: v.id("sites"),
    status: v.union(
      v.literal("ACTIVE"),
      v.literal("INACTIVE"),
    ),
  },

  handler: async (ctx, args) => {
    const { site } = await requireSiteAccess(
      ctx,
      args.siteId,
    );

    await requireCompanyRole(
      ctx,
      site.companyId,
      ["SUPER_ADMIN"],
    );

    await ctx.db.patch(args.siteId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});