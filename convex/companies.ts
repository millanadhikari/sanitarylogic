import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/authorization";

export const create = mutation({
  args: {
    name: v.string(),
    legalName: v.optional(v.string()),
    tradingName: v.optional(v.string()),
    abn: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Prevent the same user from accidentally
    // creating multiple companies during onboarding.
    const existingMembership = await ctx.db
      .query("companyMembers")
      .withIndex("by_user", (q) =>
        q.eq("userId", user._id),
      )
      .first();

    if (existingMembership) {
      throw new Error(
        "You are already a member of a company",
      );
    }

    const now = Date.now();

    const companyId = await ctx.db.insert("companies", {
      name: args.name.trim(),

      legalName: args.legalName?.trim(),
      tradingName: args.tradingName?.trim(),
      abn: args.abn?.trim(),

      email: args.email?.trim(),
      phone: args.phone?.trim(),

      status: "ACTIVE",

      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("companyMembers", {
      companyId,
      userId: user._id,

      role: "SUPER_ADMIN",
      status: "ACTIVE",

      createdAt: now,
      updatedAt: now,
    });

    return companyId;
  },
});

export const getMyCompany = query({
  args: {},

  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const membership = await ctx.db
      .query("companyMembers")
      .withIndex("by_user", (q) =>
        q.eq("userId", user._id),
      )
      .first();

    if (!membership) {
      return null;
    }

    const company = await ctx.db.get(
      membership.companyId,
    );

    if (!company) {
      return null;
    }

    return {
      company,
      membership,
    };
  },
});