import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

import schema from "./schema";
import {
  requireComplaintManagementAccess,
  requireTenancyAccess,
} from "./lib/authorization";

function cleanOptional(value?: string) {
  const cleaned = value?.trim();

  return cleaned || undefined;
}

export const getByTenancy = query({
  args: {
    tenancyId: v.id("tenancies"),
  },
  returns: v.array(schema.doc("tenancyComplaints")),

  handler: async (ctx, args) => {
    await requireTenancyAccess(ctx, args.tenancyId);

    const complaints = await ctx.db
      .query("tenancyComplaints")
      .withIndex("by_tenancy", (q) => q.eq("tenancyId", args.tenancyId))
      .order("desc")
      .take(200);

    return complaints.filter((complaint) => !complaint.deletedAt);
  },
});

export const getById = query({
  args: {
    complaintId: v.id("tenancyComplaints"),
  },
  returns: v.union(
    v.null(),
    v.object({
      complaint: schema.doc("tenancyComplaints"),
      createdBy: v.union(
        v.null(),
        v.object({
          _id: v.id("users"),
          firstName: v.optional(v.string()),
          lastName: v.optional(v.string()),
          email: v.optional(v.string()),
        }),
      ),
      sourceWorkOrder: v.union(
        v.null(),
        v.object({
          _id: v.id("workOrders"),
          workOrderNumber: v.string(),
          title: v.string(),
        }),
      ),
    }),
  ),

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
        sourceWorkOrder &&
        !sourceWorkOrder.deletedAt &&
        sourceWorkOrder.companyId === complaint.companyId &&
        sourceWorkOrder.siteId === complaint.siteId &&
        sourceWorkOrder.tenancyId === complaint.tenancyId
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
  returns: v.id("tenancyComplaints"),

  handler: async (ctx, args) => {
    const access = await requireComplaintManagementAccess(ctx, args.tenancyId);
    const { tenancy, user } = access;

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
  returns: v.null(),

  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);

    if (!complaint || complaint.deletedAt) {
      throw new Error("Complaint not found");
    }

    await requireComplaintManagementAccess(ctx, complaint.tenancyId);

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

    return null;
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
  returns: v.null(),

  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);

    if (!complaint || complaint.deletedAt) {
      throw new Error("Complaint not found");
    }

    await requireComplaintManagementAccess(ctx, complaint.tenancyId);

    const now = Date.now();

    await ctx.db.patch(complaint._id, {
      status: args.status,

      resolvedAt:
        args.status === "RESOLVED" || args.status === "CLOSED"
          ? (complaint.resolvedAt ?? now)
          : undefined,

      updatedAt: now,
    });

    return null;
  },
});

export const remove = mutation({
  args: {
    complaintId: v.id("tenancyComplaints"),
  },
  returns: v.object({ success: v.boolean() }),

  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);

    if (!complaint || complaint.deletedAt) {
      throw new Error("Complaint not found");
    }

    await requireComplaintManagementAccess(ctx, complaint.tenancyId);

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
