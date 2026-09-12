import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

import { requireTenancyAccess, requireUser } from "./lib/authorization";

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

    const complaints = await ctx.db
      .query("tenancyComplaints")
      .withIndex("by_tenancy", (q) => q.eq("tenancyId", args.tenancyId))
      .collect();

    return complaints
      .filter((complaint) => !complaint.deletedAt)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getById = query({
  args: {
    complaintId: v.id("tenancyComplaints"),
  },

  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);

    if (!complaint || complaint.deletedAt) {
      return null;
    }

    await requireTenancyAccess(ctx, complaint.tenancyId);

    const createdBy = await ctx.db.get(complaint.createdBy);

    let sourceWorkOrder = null;

    if (complaint.sourceWorkOrderId) {
      sourceWorkOrder = await ctx.db.get(complaint.sourceWorkOrderId);
    }

    return {
      complaint,

      createdBy: createdBy
        ? {
            _id: createdBy._id,
            firstName: createdBy.firstName,
            lastName: createdBy.lastName,
            email: createdBy.email,
          }
        : null,

      sourceWorkOrder:
        sourceWorkOrder && !sourceWorkOrder.deletedAt
          ? {
              _id: sourceWorkOrder._id,
              workOrderNumber: sourceWorkOrder.workOrderNumber,
              title: sourceWorkOrder.title,
            }
          : null,
    };
  },
});

export const create = mutation({
  args: {
    tenancyId: v.id("tenancies"),

    sourceWorkOrderId: v.optional(v.id("workOrders")),

    title: v.string(),

    description: v.string(),

    category: v.optional(v.string()),

    priority: v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
      v.literal("URGENT"),
    ),
  },

  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    await requireTenancyAccess(ctx, args.tenancyId);

    const tenancy = await ctx.db.get(args.tenancyId);

    if (!tenancy) {
      throw new Error("Tenancy not found");
    }

    if (!args.title.trim()) {
      throw new Error("Complaint title is required");
    }

    if (!args.description.trim()) {
      throw new Error("Complaint description is required");
    }

    if (args.sourceWorkOrderId) {
      const workOrder = await ctx.db.get(args.sourceWorkOrderId);

      if (!workOrder || workOrder.deletedAt) {
        throw new Error("Source work order not found");
      }

      if (workOrder.tenancyId !== args.tenancyId) {
        throw new Error("Work order does not belong to this tenancy");
      }
    }

    const now = Date.now();

    return await ctx.db.insert("tenancyComplaints", {
      companyId: tenancy.companyId,

      siteId: tenancy.siteId,

      tenancyId: tenancy._id,

      sourceWorkOrderId: args.sourceWorkOrderId,

      title: args.title.trim(),

      description: args.description.trim(),

      category: cleanOptional(args.category),

      priority: args.priority,

      status: "OPEN",

      createdBy: user._id,

      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    complaintId: v.id("tenancyComplaints"),

    title: v.string(),

    description: v.string(),

    category: v.optional(v.string()),

    priority: v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
      v.literal("URGENT"),
    ),
  },

  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);

    if (!complaint || complaint.deletedAt) {
      throw new Error("Complaint not found");
    }

    await requireTenancyAccess(ctx, complaint.tenancyId);

    if (!args.title.trim()) {
      throw new Error("Complaint title is required");
    }

    if (!args.description.trim()) {
      throw new Error("Complaint description is required");
    }

    await ctx.db.patch(complaint._id, {
      title: args.title.trim(),

      description: args.description.trim(),

      category: cleanOptional(args.category),

      priority: args.priority,

      updatedAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: {
    complaintId: v.id("tenancyComplaints"),

    status: v.union(
      v.literal("OPEN"),
      v.literal("IN_PROGRESS"),
      v.literal("RESOLVED"),
      v.literal("CLOSED"),
    ),
  },

  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);

    if (!complaint || complaint.deletedAt) {
      throw new Error("Complaint not found");
    }

    await requireTenancyAccess(ctx, complaint.tenancyId);

    const now = Date.now();

    await ctx.db.patch(complaint._id, {
      status: args.status,

      resolvedAt:
        args.status === "RESOLVED" || args.status === "CLOSED"
          ? (complaint.resolvedAt ?? now)
          : undefined,

      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: {
    complaintId: v.id("tenancyComplaints"),
  },

  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);

    if (!complaint || complaint.deletedAt) {
      throw new Error("Complaint not found");
    }

    await requireTenancyAccess(ctx, complaint.tenancyId);

    const now = Date.now();

    await ctx.db.patch(complaint._id, {
      deletedAt: now,
      updatedAt: now,
    });

    return {
      success: true,
    };
  },
});
