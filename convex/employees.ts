import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  requireEmployeeSiteManagementAccess,
  requireSiteAccess,
  requireUser,
} from "./lib/authorization";

const employmentTypeV = v.union(
  v.literal("FULL_TIME"),
  v.literal("PART_TIME"),
  v.literal("CASUAL"),
  v.literal("CONTRACTOR"),
);
const employeeStatusV = v.union(
  v.literal("ACTIVE"),
  v.literal("INACTIVE"),
  v.literal("TERMINATED"),
);
const assignmentRoleV = v.union(
  v.literal("CLEANER"),
  v.literal("SUPERVISOR"),
  v.literal("OTHER"),
);
const employeeFields = {
  employeeNumber: v.optional(v.string()),
  firstName: v.string(),
  lastName: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  jobTitle: v.optional(v.string()),
  employmentType: employmentTypeV,
  startDate: v.optional(v.number()),
  emergencyContactName: v.optional(v.string()),
  emergencyContactPhone: v.optional(v.string()),
  emergencyContactRelationship: v.optional(v.string()),
  address: v.optional(v.string()),
  suburb: v.optional(v.string()),
  state: v.optional(v.string()),
  postcode: v.optional(v.string()),
  notes: v.optional(v.string()),
};
type Ctx = QueryCtx | MutationCtx;

const optional = (value?: string) => value?.trim() || undefined;
const normalizeEmail = (value?: string) => optional(value)?.toLowerCase();

async function getMembership(ctx: Ctx) {
  const user = await requireUser(ctx);
  const membership = await ctx.db
    .query("companyMembers")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
  if (!membership || membership.status !== "ACTIVE") {
    throw new Error("You do not belong to an active company");
  }
  return { user, membership };
}

async function accessibleSiteIds(ctx: Ctx, userId: Id<"users">, companyId: Id<"companies">) {
  const rows = await ctx.db
    .query("siteAssignments")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .take(500);
  return new Set(
    rows
      .filter((row) => row.companyId === companyId && row.status === "ACTIVE")
      .map((row) => row.siteId as string),
  );
}

async function requireEmployeeAccess(ctx: Ctx, employee: Doc<"employees">, manage = false) {
  const { user, membership } = await getMembership(ctx);
  if (membership.companyId !== employee.companyId) throw new Error("Employee not found");
  if (membership.role === "CLEANER") throw new Error("You do not have access to employees");
  if (membership.role === "SUPER_ADMIN") return { user, membership };
  if (manage && membership.role === "SUPERVISOR") {
    throw new Error("You do not have permission to manage employees");
  }
  const sites = await accessibleSiteIds(ctx, user._id, employee.companyId);
  const assignments = await ctx.db
    .query("employeeSiteAssignments")
    .withIndex("by_employee", (q) => q.eq("employeeId", employee._id))
    .take(100);
  if (!assignments.some((row) => row.status === "ACTIVE" && sites.has(row.siteId))) {
    throw new Error("You do not have access to this employee");
  }
  return { user, membership };
}

async function ensureUnique(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  employeeNumber?: string,
  email?: string,
  ignoreId?: Id<"employees">,
) {
  if (employeeNumber) {
    const row = await ctx.db
      .query("employees")
      .withIndex("by_company_and_employeeNumber", (q) =>
        q.eq("companyId", companyId).eq("employeeNumber", employeeNumber),
      )
      .first();
    if (row && row._id !== ignoreId && !row.deletedAt) {
      throw new Error("Employee number is already in use");
    }
  }
  if (email) {
    const row = await ctx.db
      .query("employees")
      .withIndex("by_company_and_email", (q) => q.eq("companyId", companyId).eq("email", email))
      .first();
    if (row && row._id !== ignoreId && !row.deletedAt) {
      throw new Error("Email is already in use by another employee");
    }
  }
}

function cleanFields(args: {
  employeeNumber?: string; firstName: string; lastName: string; email?: string;
  phone?: string; jobTitle?: string; employmentType: "FULL_TIME" | "PART_TIME" | "CASUAL" | "CONTRACTOR";
  startDate?: number; emergencyContactName?: string; emergencyContactPhone?: string; emergencyContactRelationship?: string;
  address?: string; suburb?: string; state?: string; postcode?: string; notes?: string;
}) {
  const firstName = args.firstName.trim();
  const lastName = args.lastName.trim();
  if (!firstName || !lastName) throw new Error("First and last name are required");
  return {
    employeeNumber: optional(args.employeeNumber), firstName, lastName,
    email: normalizeEmail(args.email), phone: optional(args.phone), jobTitle: optional(args.jobTitle),
    employmentType: args.employmentType, startDate: args.startDate,
    emergencyContactName: optional(args.emergencyContactName),
    emergencyContactPhone: optional(args.emergencyContactPhone), address: optional(args.address),
    emergencyContactRelationship: optional(args.emergencyContactRelationship),
    suburb: optional(args.suburb), state: optional(args.state), postcode: optional(args.postcode), notes: optional(args.notes),
  };
}

async function enrich(ctx: QueryCtx, employee: Doc<"employees">) {
  const assignments = await ctx.db
    .query("employeeSiteAssignments")
    .withIndex("by_employee", (q) => q.eq("employeeId", employee._id))
    .take(100);
  return {
    ...employee,
    profileImageUrl: employee.profileImageStorageId
      ? await ctx.storage.getUrl(employee.profileImageStorageId)
      : null,
    siteAssignments: await Promise.all(
      assignments.filter((x) => x.status === "ACTIVE").map(async (assignment) => ({
        ...assignment,
        siteName: (await ctx.db.get(assignment.siteId))?.name ?? "Unknown site",
      })),
    ),
  };
}

export const list = query({
  args: { siteId: v.optional(v.id("sites")), status: v.optional(employeeStatusV) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { user, membership } = await getMembership(ctx);
    if (membership.role === "CLEANER") throw new Error("You do not have access to employees");
    if (args.siteId) await requireSiteAccess(ctx, args.siteId);
    let rows = await ctx.db.query("employees")
      .withIndex("by_company", (q) => q.eq("companyId", membership.companyId)).take(500);
    rows = rows.filter((row) => !row.deletedAt && (!args.status || row.status === args.status));
    const visibleSites = membership.role === "SUPER_ADMIN"
      ? null
      : await accessibleSiteIds(ctx, user._id, membership.companyId);
    const results = [];
    for (const employee of rows) {
      const item = await enrich(ctx, employee);
      const matchingAssignments = item.siteAssignments.filter((assignment) =>
        (!args.siteId || assignment.siteId === args.siteId) &&
        (visibleSites === null || visibleSites.has(assignment.siteId)),
      );
      if (args.siteId && matchingAssignments.length === 0) continue;
      if (visibleSites !== null && matchingAssignments.length === 0) continue;
      results.push({ ...item, siteAssignments: matchingAssignments });
    }
    return { companyId: membership.companyId, role: membership.role, canCreate: membership.role !== "SUPERVISOR", employees: results };
  },
});

export const getById = query({
  args: { employeeId: v.id("employees") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || employee.deletedAt) return null;
    const access = await requireEmployeeAccess(ctx, employee);
    const onboardingItems = await ctx.db.query("employeeOnboardingItems")
      .withIndex("by_employee", (q) => q.eq("employeeId", employee._id)).take(100);
    return {
      employee: await enrich(ctx, employee), onboardingItems: onboardingItems.sort((a, b) => a.sortOrder - b.sortOrder),
      role: access.membership.role,
      canEdit: access.membership.role !== "SUPERVISOR",
      canSetCompanyStatus: access.membership.role === "SUPER_ADMIN",
    };
  },
});

export const assignmentCandidates = query({
  args: { siteId: v.id("sites") }, returns: v.any(),
  handler: async (ctx, args) => {
    const access = await requireEmployeeSiteManagementAccess(ctx, args.siteId);
    const employees = await ctx.db.query("employees")
      .withIndex("by_company_and_status", (q) => q.eq("companyId", access.site.companyId).eq("status", "ACTIVE")).take(500);
    const candidates = [];
    for (const employee of employees.filter((row) => !row.deletedAt)) {
      const assignment = await ctx.db.query("employeeSiteAssignments")
        .withIndex("by_employee_and_site", (q) => q.eq("employeeId", employee._id).eq("siteId", args.siteId)).first();
      if (!assignment || assignment.status !== "ACTIVE") candidates.push({
        employeeId: employee._id, firstName: employee.firstName, lastName: employee.lastName,
        employeeNumber: employee.employeeNumber, email: employee.email, phone: employee.phone, jobTitle: employee.jobTitle,
      });
    }
    return candidates;
  },
});

export const create = mutation({
  args: { siteId: v.optional(v.id("sites")), assignmentRole: v.optional(assignmentRoleV), ...employeeFields },
  returns: v.id("employees"),
  handler: async (ctx, args) => {
    const { user, membership } = await getMembership(ctx);
    if (membership.role === "SUPERVISOR" || membership.role === "CLEANER") throw new Error("You do not have permission to create employees");
    if (membership.role !== "SUPER_ADMIN" && !args.siteId) throw new Error("A site assignment is required");
    if (args.siteId) await requireEmployeeSiteManagementAccess(ctx, args.siteId);
    const { siteId, assignmentRole, ...input } = args;
    const fields = cleanFields(input);
    await ensureUnique(ctx, membership.companyId, fields.employeeNumber, fields.email);
    const now = Date.now();
    const employeeId = await ctx.db.insert("employees", {
      companyId: membership.companyId, ...fields, status: "ACTIVE", createdBy: user._id, createdAt: now, updatedAt: now,
    });
    if (siteId) await ctx.db.insert("employeeSiteAssignments", {
      companyId: membership.companyId, siteId, employeeId, assignmentRole: assignmentRole ?? "CLEANER",
      isPrimarySite: true, status: "ACTIVE", assignedAt: now, createdAt: now, updatedAt: now,
    });
    const template = (await ctx.db.query("onboardingTemplates")
      .withIndex("by_company", (q) => q.eq("companyId", membership.companyId)).take(100))
      .find((row) => row.status === "ACTIVE");
    if (template) {
      const items = await ctx.db.query("onboardingTemplateItems")
        .withIndex("by_template", (q) => q.eq("templateId", template._id)).take(100);
      for (const item of items.filter((x) => x.status === "ACTIVE")) {
        await ctx.db.insert("employeeOnboardingItems", {
          companyId: membership.companyId, employeeId, templateId: template._id, templateItemId: item._id,
          title: item.title, description: item.description, sortOrder: item.sortOrder, required: item.required,
          status: "PENDING", createdAt: now, updatedAt: now,
        });
      }
    }
    return employeeId;
  },
});

export const update = mutation({
  args: { employeeId: v.id("employees"), ...employeeFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || employee.deletedAt) throw new Error("Employee not found");
    await requireEmployeeAccess(ctx, employee, true);
    const { employeeId, ...input } = args;
    const fields = cleanFields(input);
    await ensureUnique(ctx, employee.companyId, fields.employeeNumber, fields.email, employeeId);
    await ctx.db.patch(employeeId, { ...fields, updatedAt: Date.now() });
    return null;
  },
});

export const setStatus = mutation({
  args: { employeeId: v.id("employees"), status: employeeStatusV },
  returns: v.null(),
  handler: async (ctx, args) => {
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || employee.deletedAt) throw new Error("Employee not found");
    const access = await requireEmployeeAccess(ctx, employee, true);
    if (access.membership.role !== "SUPER_ADMIN") throw new Error("Only a Super Admin can change company employment status");
    await ctx.db.patch(employee._id, { status: args.status, updatedAt: Date.now() });
    return null;
  },
});

export const archive = mutation({
  args: { employeeId: v.id("employees") }, returns: v.null(),
  handler: async (ctx, args) => {
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || employee.deletedAt) throw new Error("Employee not found");
    const access = await requireEmployeeAccess(ctx, employee, true);
    if (access.membership.role !== "SUPER_ADMIN") throw new Error("Only a Super Admin can archive company employees");
    await ctx.db.patch(employee._id, { status: "INACTIVE", deletedAt: Date.now(), updatedAt: Date.now() });
    return null;
  },
});

export const assignSite = mutation({
  args: { employeeId: v.id("employees"), siteId: v.id("sites"), assignmentRole: assignmentRoleV, isPrimarySite: v.boolean() },
  returns: v.id("employeeSiteAssignments"),
  handler: async (ctx, args) => {
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || employee.deletedAt) throw new Error("Employee not found");
    const access = await requireEmployeeSiteManagementAccess(ctx, args.siteId);
    if (access.site.companyId !== employee.companyId) throw new Error("Employee and site must belong to the same company");
    const existing = await ctx.db.query("employeeSiteAssignments")
      .withIndex("by_employee_and_site", (q) => q.eq("employeeId", employee._id).eq("siteId", args.siteId)).first();
    const now = Date.now();
    if (args.isPrimarySite) {
      const rows = await ctx.db.query("employeeSiteAssignments").withIndex("by_employee", (q) => q.eq("employeeId", employee._id)).take(100);
      for (const row of rows) if (row.isPrimarySite) await ctx.db.patch(row._id, { isPrimarySite: false, updatedAt: now });
    }
    if (existing) {
      await ctx.db.patch(existing._id, { assignmentRole: args.assignmentRole, isPrimarySite: args.isPrimarySite, status: "ACTIVE", assignedAt: now, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("employeeSiteAssignments", {
      companyId: employee.companyId, employeeId: employee._id, siteId: args.siteId,
      assignmentRole: args.assignmentRole, isPrimarySite: args.isPrimarySite, status: "ACTIVE", assignedAt: now, createdAt: now, updatedAt: now,
    });
  },
});

export const removeSiteAssignment = mutation({
  args: { assignmentId: v.id("employeeSiteAssignments") }, returns: v.null(),
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");
    await requireEmployeeSiteManagementAccess(ctx, assignment.siteId);
    await ctx.db.patch(assignment._id, { status: "INACTIVE", isPrimarySite: false, updatedAt: Date.now() });
    return null;
  },
});

export const generateUploadUrl = mutation({
  args: { employeeId: v.id("employees") }, returns: v.string(),
  handler: async (ctx, args) => {
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || employee.deletedAt) throw new Error("Employee not found");
    await requireEmployeeAccess(ctx, employee, true);
    return await ctx.storage.generateUploadUrl();
  },
});

export const setProfileImage = mutation({
  args: { employeeId: v.id("employees"), storageId: v.optional(v.id("_storage")) }, returns: v.null(),
  handler: async (ctx, args) => {
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || employee.deletedAt) throw new Error("Employee not found");
    await requireEmployeeAccess(ctx, employee, true);
    await ctx.db.patch(employee._id, { profileImageStorageId: args.storageId, updatedAt: Date.now() });
    if (employee.profileImageStorageId && employee.profileImageStorageId !== args.storageId) await ctx.storage.delete(employee.profileImageStorageId);
    return null;
  },
});
