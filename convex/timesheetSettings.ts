import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import schema from "./schema";
import {
  requireTimesheetManagementAccess,
  requireTimesheetReadAccess,
} from "./lib/authorization";
import { assertRosterDate } from "./lib/roster";

const periodTypeV = v.union(v.literal("WEEKLY"), v.literal("FORTNIGHTLY"), v.literal("MONTHLY"));
const weekdayV = v.union(
  v.literal(0), v.literal(1), v.literal(2), v.literal(3),
  v.literal(4), v.literal(5), v.literal(6),
);
const roleV = v.union(v.literal("SUPER_ADMIN"), v.literal("AREA_MANAGER"), v.literal("SITE_MANAGER"), v.literal("SUPERVISOR"));

export const get = query({
  args: { siteId: v.id("sites") },
  returns: v.object({
    role: roleV,
    canManage: v.boolean(),
    settings: v.union(schema.doc("siteTimesheetSettings"), v.null()),
    effective: v.object({
      periodType: periodTypeV,
      weekStartsOn: weekdayV,
      fortnightAnchorDate: v.optional(v.string()),
    }),
  }),
  handler: async (ctx, args) => {
    const access = await requireTimesheetReadAccess(ctx, args.siteId);
    const settings = await ctx.db.query("siteTimesheetSettings")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId)).unique();
    return {
      role: access.role,
      canManage: access.role !== "SUPERVISOR",
      settings,
      effective: settings?.status === "ACTIVE"
        ? { periodType: settings.periodType, weekStartsOn: settings.weekStartsOn, fortnightAnchorDate: settings.fortnightAnchorDate }
        : { periodType: "WEEKLY" as const, weekStartsOn: 1 as const },
    };
  },
});

export const save = mutation({
  args: {
    siteId: v.id("sites"),
    periodType: periodTypeV,
    weekStartsOn: weekdayV,
    fortnightAnchorDate: v.optional(v.string()),
  },
  returns: v.id("siteTimesheetSettings"),
  handler: async (ctx, args) => {
    const access = await requireTimesheetManagementAccess(ctx, args.siteId);
    if (args.periodType === "FORTNIGHTLY" && !args.fortnightAnchorDate) {
      throw new Error("Fortnightly cycles require an anchor date");
    }
    if (args.fortnightAnchorDate) assertRosterDate(args.fortnightAnchorDate, "Fortnight anchor date");
    const existing = await ctx.db.query("siteTimesheetSettings")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId)).unique();
    const now = Date.now();
    const values = {
      periodType: args.periodType,
      weekStartsOn: args.weekStartsOn,
      fortnightAnchorDate: args.periodType === "FORTNIGHTLY" ? args.fortnightAnchorDate : undefined,
      status: "ACTIVE" as const,
      updatedBy: access.user._id,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, values);
      return existing._id;
    }
    return await ctx.db.insert("siteTimesheetSettings", {
      companyId: access.site.companyId,
      siteId: args.siteId,
      ...values,
      createdBy: access.user._id,
      createdAt: now,
    });
  },
});
