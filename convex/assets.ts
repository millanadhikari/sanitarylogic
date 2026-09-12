import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireAssetMasterManagementAccess,
  requireAssetOperationsAccess,
  requireSiteAccess,
} from "./lib/authorization";
import { assetDueState } from "./lib/assetDueDates";

const statusV = v.union(
  v.literal("ACTIVE"),
  v.literal("OUT_OF_SERVICE"),
  v.literal("DISPOSED"),
  v.literal("ARCHIVED"),
);
const resultV = v.union(
  v.literal("PASS"),
  v.literal("FAIL"),
  v.literal("REQUIRES_ACTION"),
);
const maintenanceTypeV = v.union(
  v.literal("SERVICE"),
  v.literal("REPAIR"),
  v.literal("INSPECTION"),
  v.literal("PREVENTIVE"),
  v.literal("OTHER"),
);
const maintenanceStatusV = v.union(
  v.literal("COMPLETED"),
  v.literal("REQUIRES_FOLLOW_UP"),
);
const optional = (value?: string) => value?.trim() || undefined;
const date = (value: string, label: string) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  )
    throw new Error(`${label} must be a valid date`);
};
const canManage = (role: string) =>
  role === "SUPER_ADMIN" || role === "AREA_MANAGER" || role === "SITE_MANAGER";
const canOperate = (role: string) => role !== "CLEANER";

async function loadSiteRows(
  ctx: Parameters<typeof requireSiteAccess>[0],
  siteId: Parameters<typeof requireSiteAccess>[1],
) {
  const [assets, tests, maintenance] = await Promise.all([
    ctx.db
      .query("assets")
      .withIndex("by_siteId", (q) => q.eq("siteId", siteId))
      .take(1000),
    ctx.db
      .query("assetTestAndTagRecords")
      .withIndex("by_siteId", (q) => q.eq("siteId", siteId))
      .take(5000),
    ctx.db
      .query("assetMaintenanceRecords")
      .withIndex("by_siteId", (q) => q.eq("siteId", siteId))
      .take(5000),
  ]);
  return {
    assets: assets.filter((x) => !x.deletedAt),
    tests: tests.filter((x) => !x.deletedAt),
    maintenance: maintenance.filter((x) => !x.deletedAt),
  };
}

export const list = query({
  args: { siteId: v.id("sites"), today: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const access = await requireSiteAccess(ctx, args.siteId);
    date(args.today, "Today");
    const data = await loadSiteRows(ctx, args.siteId);
    const items = data.assets.map((asset) => {
      const tests = data.tests
        .filter((x) => x.assetId === asset._id)
        .sort((a, b) => b.testDate.localeCompare(a.testDate));
      const maintenance = data.maintenance
        .filter((x) => x.assetId === asset._id)
        .sort((a, b) => b.maintenanceDate.localeCompare(a.maintenanceDate));
      const latestTest = tests[0] ?? null;
      const latestMaintenance = maintenance[0] ?? null;
      return {
        asset,
        latestTest,
        testDueState: assetDueState(latestTest?.nextTestDueDate, args.today),
        latestMaintenance,
        maintenanceDueState: assetDueState(
          latestMaintenance?.nextMaintenanceDueDate,
          args.today,
        ),
      };
    });
    return {
      site: access.site,
      role: access.role,
      canManage: canManage(access.role),
      canOperate: canOperate(access.role),
      items,
      summary: {
        total: items.length,
        active: items.filter((x) => x.asset.status === "ACTIVE").length,
        testDue: items.filter(
          (x) => x.testDueState === "DUE_SOON" || x.testDueState === "OVERDUE",
        ).length,
        maintenanceDue: items.filter(
          (x) =>
            x.maintenanceDueState === "DUE_SOON" ||
            x.maintenanceDueState === "OVERDUE",
        ).length,
      },
    };
  },
});

export const getById = query({
  args: { assetId: v.id("assets"), today: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.deletedAt) return null;
    const access = await requireSiteAccess(ctx, asset.siteId);
    const [tests, maintenance, photos] = await Promise.all([
      ctx.db
        .query("assetTestAndTagRecords")
        .withIndex("by_assetId", (q) => q.eq("assetId", asset._id))
        .take(1000),
      ctx.db
        .query("assetMaintenanceRecords")
        .withIndex("by_assetId", (q) => q.eq("assetId", asset._id))
        .take(1000),
      ctx.db
        .query("assetPhotos")
        .withIndex("by_assetId", (q) => q.eq("assetId", asset._id))
        .take(500),
    ]);
    const activeTests = tests
      .filter((x) => !x.deletedAt)
      .sort((a, b) => b.testDate.localeCompare(a.testDate));
    const activeMaintenance = maintenance
      .filter((x) => !x.deletedAt)
      .sort((a, b) => b.maintenanceDate.localeCompare(a.maintenanceDate));
    return {
      site: access.site,
      role: access.role,
      canManage: canManage(access.role),
      canOperate: canOperate(access.role),
      asset,
      tests: activeTests,
      maintenance: activeMaintenance,
      photos: await Promise.all(
        photos
          .filter((x) => !x.deletedAt)
          .map(async (photo) => ({
            ...photo,
            url: await ctx.storage.getUrl(photo.storageId),
          })),
      ),
      testDueState: assetDueState(activeTests[0]?.nextTestDueDate, args.today),
      maintenanceDueState: assetDueState(
        activeMaintenance[0]?.nextMaintenanceDueDate,
        args.today,
      ),
    };
  },
});

const assetFields = {
  assetName: v.string(),
  assetCode: v.optional(v.string()),
  description: v.optional(v.string()),
  category: v.optional(v.string()),
  assetType: v.optional(v.string()),
  manufacturer: v.optional(v.string()),
  model: v.optional(v.string()),
  serialNumber: v.optional(v.string()),
  location: v.optional(v.string()),
  purchaseDate: v.optional(v.string()),
  purchasePriceCents: v.optional(v.number()),
  status: statusV,
  notes: v.optional(v.string()),
};
function cleanAsset(args: {
  assetName: string;
  assetCode?: string;
  description?: string;
  category?: string;
  assetType?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  purchaseDate?: string;
  purchasePriceCents?: number;
  status: "ACTIVE" | "OUT_OF_SERVICE" | "DISPOSED" | "ARCHIVED";
  notes?: string;
}) {
  if (!args.assetName.trim()) throw new Error("Asset name is required");
  if (args.purchaseDate) date(args.purchaseDate, "Purchase date");
  if (
    args.purchasePriceCents !== undefined &&
    (!Number.isInteger(args.purchasePriceCents) || args.purchasePriceCents < 0)
  )
    throw new Error("Purchase price must be non-negative cents");
  return {
    ...args,
    assetName: args.assetName.trim(),
    assetCode: optional(args.assetCode),
    description: optional(args.description),
    category: optional(args.category),
    assetType: optional(args.assetType),
    manufacturer: optional(args.manufacturer),
    model: optional(args.model),
    serialNumber: optional(args.serialNumber),
    location: optional(args.location),
    notes: optional(args.notes),
  };
}
export const create = mutation({
  args: { siteId: v.id("sites"), ...assetFields },
  returns: v.id("assets"),
  handler: async (ctx, args) => {
    const access = await requireAssetMasterManagementAccess(ctx, args.siteId);
    const now = Date.now();
    return await ctx.db.insert("assets", {
      companyId: access.site.companyId,
      siteId: args.siteId,
      ...cleanAsset(args),
      createdBy: access.user._id,
      updatedBy: access.user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});
export const update = mutation({
  args: { assetId: v.id("assets"), ...assetFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.deletedAt) throw new Error("Asset not found");
    const access = await requireAssetMasterManagementAccess(ctx, asset.siteId);
    const { assetId, ...fields } = args;
    await ctx.db.patch(assetId, {
      ...cleanAsset(fields),
      updatedBy: access.user._id,
      updatedAt: Date.now(),
    });
    return null;
  },
});
export const remove = mutation({
  args: { assetId: v.id("assets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.deletedAt) throw new Error("Asset not found");
    const access = await requireAssetMasterManagementAccess(ctx, asset.siteId);
    await ctx.db.patch(asset._id, {
      status: "ARCHIVED",
      deletedAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: access.user._id,
    });
    return null;
  },
});

const testFields = {
  testDate: v.string(),
  nextTestDueDate: v.optional(v.string()),
  result: resultV,
  tagNumber: v.optional(v.string()),
  testedByName: v.optional(v.string()),
  testerCompany: v.optional(v.string()),
  notes: v.optional(v.string()),
};
export const saveTest = mutation({
  args: {
    assetId: v.id("assets"),
    recordId: v.optional(v.id("assetTestAndTagRecords")),
    ...testFields,
  },
  returns: v.id("assetTestAndTagRecords"),
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.deletedAt) throw new Error("Asset not found");
    const access = await requireAssetOperationsAccess(ctx, asset.siteId);
    date(args.testDate, "Test date");
    if (args.nextTestDueDate) date(args.nextTestDueDate, "Next test due date");
    const now = Date.now();
    const fields = {
      testDate: args.testDate,
      nextTestDueDate: args.nextTestDueDate,
      result: args.result,
      tagNumber: optional(args.tagNumber),
      testedByName: optional(args.testedByName),
      testerCompany: optional(args.testerCompany),
      notes: optional(args.notes),
      updatedBy: access.user._id,
      updatedAt: now,
    };
    if (args.recordId) {
      const row = await ctx.db.get(args.recordId);
      if (!row || row.deletedAt || row.assetId !== asset._id)
        throw new Error("Test record not found");
      await ctx.db.patch(row._id, fields);
      return row._id;
    }
    return await ctx.db.insert("assetTestAndTagRecords", {
      companyId: asset.companyId,
      siteId: asset.siteId,
      assetId: asset._id,
      ...fields,
      createdBy: access.user._id,
      createdAt: now,
    });
  },
});
export const removeTest = mutation({
  args: { recordId: v.id("assetTestAndTagRecords") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.recordId);
    if (!row || row.deletedAt) throw new Error("Test record not found");
    const access = await requireAssetOperationsAccess(ctx, row.siteId);
    await ctx.db.patch(row._id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: access.user._id,
    });
    return null;
  },
});

const maintenanceFields = {
  maintenanceDate: v.string(),
  maintenanceType: maintenanceTypeV,
  description: v.string(),
  serviceProvider: v.optional(v.string()),
  technicianName: v.optional(v.string()),
  costCents: v.optional(v.number()),
  nextMaintenanceDueDate: v.optional(v.string()),
  status: maintenanceStatusV,
  notes: v.optional(v.string()),
};
export const saveMaintenance = mutation({
  args: {
    assetId: v.id("assets"),
    recordId: v.optional(v.id("assetMaintenanceRecords")),
    ...maintenanceFields,
  },
  returns: v.id("assetMaintenanceRecords"),
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.deletedAt) throw new Error("Asset not found");
    const access = await requireAssetOperationsAccess(ctx, asset.siteId);
    date(args.maintenanceDate, "Maintenance date");
    if (args.nextMaintenanceDueDate)
      date(args.nextMaintenanceDueDate, "Next due date");
    if (!args.description.trim()) throw new Error("Description is required");
    if (
      args.costCents !== undefined &&
      (!Number.isInteger(args.costCents) || args.costCents < 0)
    )
      throw new Error("Cost must be non-negative cents");
    const now = Date.now();
    const fields = {
      maintenanceDate: args.maintenanceDate,
      maintenanceType: args.maintenanceType,
      description: args.description.trim(),
      serviceProvider: optional(args.serviceProvider),
      technicianName: optional(args.technicianName),
      costCents: args.costCents,
      nextMaintenanceDueDate: args.nextMaintenanceDueDate,
      status: args.status,
      notes: optional(args.notes),
      updatedBy: access.user._id,
      updatedAt: now,
    };
    if (args.recordId) {
      const row = await ctx.db.get(args.recordId);
      if (!row || row.deletedAt || row.assetId !== asset._id)
        throw new Error("Maintenance record not found");
      await ctx.db.patch(row._id, fields);
      return row._id;
    }
    return await ctx.db.insert("assetMaintenanceRecords", {
      companyId: asset.companyId,
      siteId: asset.siteId,
      assetId: asset._id,
      ...fields,
      createdBy: access.user._id,
      createdAt: now,
    });
  },
});
export const removeMaintenance = mutation({
  args: { recordId: v.id("assetMaintenanceRecords") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.recordId);
    if (!row || row.deletedAt) throw new Error("Maintenance record not found");
    const access = await requireAssetOperationsAccess(ctx, row.siteId);
    await ctx.db.patch(row._id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: access.user._id,
    });
    return null;
  },
});

export const generateUploadUrl = mutation({
  args: { assetId: v.id("assets") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.deletedAt) throw new Error("Asset not found");
    await requireAssetOperationsAccess(ctx, asset.siteId);
    return await ctx.storage.generateUploadUrl();
  },
});
export const addPhoto = mutation({
  args: {
    assetId: v.id("assets"),
    storageId: v.id("_storage"),
    fileName: v.optional(v.string()),
    caption: v.optional(v.string()),
  },
  returns: v.id("assetPhotos"),
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset || asset.deletedAt) throw new Error("Asset not found");
    const access = await requireAssetOperationsAccess(ctx, asset.siteId);
    return await ctx.db.insert("assetPhotos", {
      companyId: asset.companyId,
      siteId: asset.siteId,
      assetId: asset._id,
      storageId: args.storageId,
      fileName: optional(args.fileName),
      caption: optional(args.caption),
      uploadedBy: access.user._id,
      createdAt: Date.now(),
    });
  },
});
export const removePhoto = mutation({
  args: { photoId: v.id("assetPhotos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.deletedAt) throw new Error("Photo not found");
    await requireAssetOperationsAccess(ctx, photo.siteId);
    await ctx.db.patch(photo._id, { deletedAt: Date.now() });
    return null;
  },
});

export const reportData = query({
  args: {
    siteId: v.id("sites"),
    reportType: v.union(
      v.literal("ASSETS"),
      v.literal("TEST_TAG"),
      v.literal("MAINTENANCE"),
    ),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    assetStatus: v.optional(statusV),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const access = await requireSiteAccess(ctx, args.siteId);
    const company = await ctx.db.get(access.site.companyId);
    if (!company) throw new Error("Company not found");
    const data = await loadSiteRows(ctx, args.siteId);
    const assets = data.assets.filter(
      (x) => !args.assetStatus || x.status === args.assetStatus,
    );
    const ids = new Set(assets.map((x) => x._id));
    return {
      site: access.site,
      companyName: company.name,
      generatedAt: Date.now(),
      assets,
      tests: data.tests.filter(
        (x) =>
          ids.has(x.assetId) &&
          (!args.fromDate || x.testDate >= args.fromDate) &&
          (!args.toDate || x.testDate <= args.toDate),
      ),
      maintenance: data.maintenance.filter(
        (x) =>
          ids.has(x.assetId) &&
          (!args.fromDate || x.maintenanceDate >= args.fromDate) &&
          (!args.toDate || x.maintenanceDate <= args.toDate),
      ),
    };
  },
});
