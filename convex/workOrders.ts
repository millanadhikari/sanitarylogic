import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

import {
  requireTenancyAccess,
  requireUser,
  requireWorkOrderManagementAccess,
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

    const workOrders = await ctx.db
      .query("workOrders")
      .withIndex("by_tenancy", (q) => q.eq("tenancyId", args.tenancyId))
      .collect();

    return workOrders
      .filter((workOrder) => !workOrder.deletedAt)
      .sort((a, b) => b.workOrderDate - a.workOrderDate);
  },
});

export const getById = query({
  args: {
    workOrderId: v.id("workOrders"),
  },

  handler: async (ctx, args) => {
    const workOrder = await ctx.db.get(args.workOrderId);

    if (!workOrder || workOrder.deletedAt) {
      return null;
    }

    await requireTenancyAccess(ctx, workOrder.tenancyId);

    return workOrder;
  },
});

export const create = mutation({
  args: {
    tenancyId: v.id("tenancies"),

    workOrderNumber: v.string(),

    title: v.string(),

    description: v.string(),

    quotedAmountCents: v.optional(v.number()),

    resolutionNotes: v.optional(v.string()),

    internalNotes: v.optional(v.string()),

    status: v.union(
      v.literal("OPEN"),
      v.literal("QUOTED"),
      v.literal("APPROVED"),
      v.literal("IN_PROGRESS"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED"),
    ),

    workOrderDate: v.number(),
  },

  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    await requireWorkOrderManagementAccess(ctx, args.tenancyId);

    const tenancy = await ctx.db.get(args.tenancyId);

    if (!tenancy) {
      throw new Error("Tenancy not found");
    }

    if (!args.workOrderNumber.trim()) {
      throw new Error("Work order number is required");
    }
    const workOrderNumber = args.workOrderNumber.trim();

    const existingWorkOrder = await ctx.db
      .query("workOrders")
      .withIndex("by_tenancy_and_number", (q) =>
        q
          .eq("tenancyId", args.tenancyId)
          .eq("workOrderNumber", workOrderNumber),
      )
      .first();

    if (existingWorkOrder && !existingWorkOrder.deletedAt) {
      throw new Error(
        "A work order with this number already exists for this tenancy",
      );
    }
    if (!args.title.trim()) {
      throw new Error("Title is required");
    }

    if (!args.description.trim()) {
      throw new Error("Description is required");
    }

    if (args.quotedAmountCents !== undefined && args.quotedAmountCents < 0) {
      throw new Error("Quoted amount cannot be negative");
    }

    const now = Date.now();

    return await ctx.db.insert("workOrders", {
      companyId: tenancy.companyId,

      siteId: tenancy.siteId,

      tenancyId: tenancy._id,

      workOrderNumber,
      title: args.title.trim(),

      description: args.description.trim(),

      quotedAmountCents: args.quotedAmountCents,

      resolutionNotes: cleanOptional(args.resolutionNotes),

      internalNotes: cleanOptional(args.internalNotes),

      status: args.status,

      workOrderDate: args.workOrderDate,

      completedAt: args.status === "COMPLETED" ? now : undefined,

      createdBy: user._id,

      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    workOrderId: v.id("workOrders"),

    workOrderNumber: v.string(),

    title: v.string(),

    description: v.string(),

    quotedAmountCents: v.optional(v.number()),

    resolutionNotes: v.optional(v.string()),

    internalNotes: v.optional(v.string()),

    status: v.union(
      v.literal("OPEN"),
      v.literal("QUOTED"),
      v.literal("APPROVED"),
      v.literal("IN_PROGRESS"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED"),
    ),

    workOrderDate: v.number(),
  },

  handler: async (ctx, args) => {
    const workOrder = await ctx.db.get(args.workOrderId);

    if (!workOrder || workOrder.deletedAt) {
      throw new Error("Work order not found");
    }

    await requireWorkOrderManagementAccess(ctx, workOrder.tenancyId);
    const workOrderNumber = args.workOrderNumber.trim();

    const existingWorkOrder = await ctx.db
      .query("workOrders")
      .withIndex("by_tenancy_and_number", (q) =>
        q
          .eq("tenancyId", workOrder.tenancyId)
          .eq("workOrderNumber", workOrderNumber),
      )
      .first();

    if (
      existingWorkOrder &&
      existingWorkOrder._id !== workOrder._id &&
      !existingWorkOrder.deletedAt
    ) {
      throw new Error(
        "Another work order with this number already exists for this tenancy",
      );
    }
    if (!args.workOrderNumber.trim()) {
      throw new Error("Work order number is required");
    }

    if (!args.title.trim()) {
      throw new Error("Title is required");
    }

    if (!args.description.trim()) {
      throw new Error("Description is required");
    }

    const now = Date.now();

    await ctx.db.patch(workOrder._id, {
      workOrderNumber,
      title: args.title.trim(),

      description: args.description.trim(),

      quotedAmountCents: args.quotedAmountCents,

      resolutionNotes: cleanOptional(args.resolutionNotes),

      internalNotes: cleanOptional(args.internalNotes),

      status: args.status,

      workOrderDate: args.workOrderDate,

      completedAt:
        args.status === "COMPLETED"
          ? (workOrder.completedAt ?? now)
          : undefined,

      updatedAt: now,
    });
  },
});

export const setStatus = mutation({
  args: {
    workOrderId: v.id("workOrders"),

    status: v.union(
      v.literal("OPEN"),
      v.literal("QUOTED"),
      v.literal("APPROVED"),
      v.literal("IN_PROGRESS"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED"),
    ),
  },

  handler: async (ctx, args) => {
    const workOrder = await ctx.db.get(args.workOrderId);

    if (!workOrder || workOrder.deletedAt) {
      throw new Error("Work order not found");
    }

    await requireWorkOrderManagementAccess(ctx, workOrder.tenancyId);

    const now = Date.now();

    await ctx.db.patch(workOrder._id, {
      status: args.status,

      completedAt:
        args.status === "COMPLETED"
          ? (workOrder.completedAt ?? now)
          : undefined,

      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: {
    workOrderId: v.id("workOrders"),
  },

  handler: async (ctx, args) => {
    const workOrder = await ctx.db.get(args.workOrderId);

    if (!workOrder || workOrder.deletedAt) {
      throw new Error("Work order not found");
    }

    await requireWorkOrderManagementAccess(ctx, workOrder.tenancyId);

    const now = Date.now();

    await ctx.db.patch(workOrder._id, {
      deletedAt: now,
      updatedAt: now,
    });
  },
});

export const duplicate = mutation({
  args: {
    workOrderId: v.id("workOrders"),

    newWorkOrderNumber: v.string(),

    workOrderDate: v.number(),
  },

  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const original = await ctx.db.get(args.workOrderId);

    if (!original || original.deletedAt) {
      throw new Error("Work order not found");
    }

    await requireWorkOrderManagementAccess(ctx, original.tenancyId);

    if (!args.newWorkOrderNumber.trim()) {
      throw new Error("New work order number is required");
    }

    const now = Date.now();

    return await ctx.db.insert("workOrders", {
      companyId: original.companyId,

      siteId: original.siteId,

      tenancyId: original.tenancyId,

      workOrderNumber: args.newWorkOrderNumber.trim(),

      title: original.title,

      description: original.description,

      quotedAmountCents: original.quotedAmountCents,

      internalNotes: original.internalNotes,

      status: "OPEN",

      workOrderDate: args.workOrderDate,

      createdBy: user._id,

      createdAt: now,
      updatedAt: now,
    });
  },
});
