import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import schema from "./schema";
import { requireKeyManagementAccess } from "./lib/authorization";

const keyFields = {
  assignedEmployeeId: v.optional(v.id("employees")),
  assignedUserId: v.optional(v.id("users")),
  usageWindow: v.string(),
  keyName: v.string(),
  keyNumber: v.string(),
  quantity: v.number(),
  details: v.optional(v.string()),
  code: v.optional(v.string()),
};

const assigneeValidator = v.union(
  v.object({
    kind: v.literal("EMPLOYEE"),
    id: v.id("employees"),
    name: v.string(),
    role: v.string(),
  }),
  v.object({
    kind: v.literal("USER"),
    id: v.id("users"),
    name: v.string(),
    role: v.string(),
  }),
);

type Assignee =
  | { kind: "EMPLOYEE"; id: Id<"employees">; name: string; role: string }
  | { kind: "USER"; id: Id<"users">; name: string; role: string };

type KeyInput = {
  assignedEmployeeId?: Id<"employees">;
  assignedUserId?: Id<"users">;
  usageWindow: string;
  keyName: string;
  keyNumber: string;
  quantity: number;
  details?: string;
  code?: string;
};

const optional = (value?: string) => value?.trim() || undefined;

function fullName(person: { firstName?: string; lastName?: string; email?: string }) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email || "Team member";
}

function cleanInput(input: KeyInput) {
  const usageWindow = input.usageWindow.trim();
  const keyName = input.keyName.trim();
  const keyNumber = input.keyNumber.trim();
  if (!usageWindow) throw new Error("Usage window is required");
  if (!keyName) throw new Error("Key name is required");
  if (!keyNumber) throw new Error("Key number is required");
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 999) {
    throw new Error("Number of cards/keys must be a whole number from 1 to 999");
  }
  return {
    usageWindow,
    keyName,
    keyNumber,
    quantity: input.quantity,
    details: optional(input.details),
    code: optional(input.code),
  };
}

async function assertAssignee(
  ctx: MutationCtx,
  args: {
    companyId: Id<"companies">;
    siteId: Id<"sites">;
    assignedEmployeeId?: Id<"employees">;
    assignedUserId?: Id<"users">;
  },
) {
  if (Boolean(args.assignedEmployeeId) === Boolean(args.assignedUserId)) {
    throw new Error("Select one team member");
  }

  if (args.assignedEmployeeId) {
    const [employee, assignment] = await Promise.all([
      ctx.db.get(args.assignedEmployeeId),
      ctx.db
        .query("employeeSiteAssignments")
        .withIndex("by_employee_and_site", (q) =>
          q.eq("employeeId", args.assignedEmployeeId!).eq("siteId", args.siteId),
        )
        .first(),
    ]);
    if (
      !employee ||
      employee.deletedAt ||
      employee.status !== "ACTIVE" ||
      employee.companyId !== args.companyId ||
      !assignment ||
      assignment.status !== "ACTIVE" ||
      assignment.companyId !== args.companyId
    ) {
      throw new Error("The selected employee is not active at this site");
    }
    return;
  }

  const userId = args.assignedUserId!;
  const [user, membership, siteAssignment] = await Promise.all([
    ctx.db.get(userId),
    ctx.db
      .query("companyMembers")
      .withIndex("by_user_and_company", (q) => q.eq("userId", userId).eq("companyId", args.companyId))
      .first(),
    ctx.db
      .query("siteAssignments")
      .withIndex("by_user_and_site", (q) => q.eq("userId", userId).eq("siteId", args.siteId))
      .first(),
  ]);
  if (!user || !membership || membership.status !== "ACTIVE") {
    throw new Error("The selected team member is not active");
  }
  const isSiteAssigned = siteAssignment?.status === "ACTIVE" && siteAssignment.companyId === args.companyId;
  if (!isSiteAssigned) {
    throw new Error("The selected team member is not assigned to this site");
  }
}

async function loadAssignees(ctx: QueryCtx, site: Doc<"sites">) {
  const [employeeAssignments, siteAssignments, memberships] = await Promise.all([
    ctx.db.query("employeeSiteAssignments").withIndex("by_site", (q) => q.eq("siteId", site._id)).take(500),
    ctx.db.query("siteAssignments").withIndex("by_site", (q) => q.eq("siteId", site._id)).take(500),
    ctx.db.query("companyMembers").withIndex("by_company", (q) => q.eq("companyId", site.companyId)).take(500),
  ]);

  const activeSiteAssignments = siteAssignments.filter(
    (assignment) => assignment.status === "ACTIVE" && assignment.companyId === site.companyId,
  );
  const roleByUserId = new Map(activeSiteAssignments.map((assignment) => [assignment.userId, assignment.role]));
  const assignees: Assignee[] = [];
  const representedUserIds = new Set<string>();

  for (const assignment of employeeAssignments) {
    if (assignment.status !== "ACTIVE" || assignment.companyId !== site.companyId) continue;
    const employee = await ctx.db.get(assignment.employeeId);
    if (!employee || employee.deletedAt || employee.status !== "ACTIVE" || employee.companyId !== site.companyId) continue;
    if (employee.userId) representedUserIds.add(employee.userId);
    assignees.push({
      kind: "EMPLOYEE",
      id: employee._id,
      name: fullName(employee),
      role: employee.userId ? roleByUserId.get(employee.userId) ?? assignment.assignmentRole : assignment.assignmentRole,
    });
  }

  const activeMembershipByUserId = new Map(
    memberships
      .filter((membership) => membership.status === "ACTIVE")
      .map((membership) => [membership.userId, membership]),
  );
  const siteUserIds = new Set<Id<"users">>(
    activeSiteAssignments.map((assignment) => assignment.userId),
  );

  for (const userId of siteUserIds) {
    if (representedUserIds.has(userId)) continue;
    const [user, membership] = await Promise.all([ctx.db.get(userId), Promise.resolve(activeMembershipByUserId.get(userId))]);
    if (!user || !membership) continue;
    assignees.push({
      kind: "USER",
      id: user._id,
      name: fullName(user),
      role: roleByUserId.get(userId) ?? membership.role,
    });
  }

  return assignees.sort((a, b) => a.name.localeCompare(b.name));
}

async function assigneeDetails(ctx: QueryCtx, key: Doc<"siteKeys">) {
  if (key.assignedEmployeeId) {
    const employee = await ctx.db.get(key.assignedEmployeeId);
    const [assignment, siteAssignment] = employee
      ? await Promise.all([
          ctx.db
            .query("employeeSiteAssignments")
            .withIndex("by_employee_and_site", (q) => q.eq("employeeId", employee._id).eq("siteId", key.siteId))
            .first(),
          employee.userId
            ? ctx.db
                .query("siteAssignments")
                .withIndex("by_user_and_site", (q) => q.eq("userId", employee.userId!).eq("siteId", key.siteId))
                .first()
            : Promise.resolve(null),
        ])
      : [null, null];
    return {
      name: employee ? fullName(employee) : "Former employee",
      role: siteAssignment?.role ?? assignment?.assignmentRole ?? "EMPLOYEE",
    };
  }
  if (key.assignedUserId) {
    const [user, assignment] = await Promise.all([
      ctx.db.get(key.assignedUserId),
      ctx.db
        .query("siteAssignments")
        .withIndex("by_user_and_site", (q) => q.eq("userId", key.assignedUserId!).eq("siteId", key.siteId))
        .first(),
    ]);
    return { name: user ? fullName(user) : "Former team member", role: assignment?.role ?? "SUPER_ADMIN" };
  }
  return { name: "Unassigned", role: "UNASSIGNED" };
}

export const list = query({
  args: { siteId: v.id("sites") },
  returns: v.object({
    siteName: v.string(),
    assignees: v.array(assigneeValidator),
    keys: v.array(v.object({
      key: schema.doc("siteKeys").omit("passcode"),
      assigneeName: v.string(),
      assigneeRole: v.string(),
      hasPasscode: v.boolean(),
    })),
  }),
  handler: async (ctx, args) => {
    const access = await requireKeyManagementAccess(ctx, args.siteId);
    const [rows, assignees] = await Promise.all([
      ctx.db.query("siteKeys").withIndex("by_siteId", (q) => q.eq("siteId", args.siteId)).take(500),
      loadAssignees(ctx, access.site),
    ]);
    const keys = [];
    for (const row of rows) {
      if (row.deletedAt) continue;
      const { passcode, ...key } = row;
      const assignee = await assigneeDetails(ctx, row);
      keys.push({ key, assigneeName: assignee.name, assigneeRole: assignee.role, hasPasscode: Boolean(passcode) });
    }
    return { siteName: access.site.name, assignees, keys };
  },
});

export const revealPasscode = query({
  args: { keyId: v.id("siteKeys") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key || key.deletedAt) throw new Error("Key record not found");
    await requireKeyManagementAccess(ctx, key.siteId);
    return key.passcode ?? null;
  },
});

export const create = mutation({
  args: { siteId: v.id("sites"), ...keyFields, passcode: v.optional(v.string()) },
  returns: v.id("siteKeys"),
  handler: async (ctx, args) => {
    const access = await requireKeyManagementAccess(ctx, args.siteId);
    await assertAssignee(ctx, { companyId: access.site.companyId, siteId: args.siteId, assignedEmployeeId: args.assignedEmployeeId, assignedUserId: args.assignedUserId });
    const now = Date.now();
    return await ctx.db.insert("siteKeys", {
      companyId: access.site.companyId,
      siteId: args.siteId,
      assignedEmployeeId: args.assignedEmployeeId,
      assignedUserId: args.assignedUserId,
      ...cleanInput(args),
      passcode: optional(args.passcode),
      createdBy: access.user._id,
      updatedBy: access.user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { keyId: v.id("siteKeys"), ...keyFields, passcode: v.optional(v.string()), clearPasscode: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key || key.deletedAt) throw new Error("Key record not found");
    const access = await requireKeyManagementAccess(ctx, key.siteId);
    await assertAssignee(ctx, { companyId: access.site.companyId, siteId: key.siteId, assignedEmployeeId: args.assignedEmployeeId, assignedUserId: args.assignedUserId });
    const passcode = optional(args.passcode);
    await ctx.db.patch(key._id, {
      assignedEmployeeId: args.assignedEmployeeId,
      assignedUserId: args.assignedUserId,
      ...cleanInput(args),
      ...(args.clearPasscode ? { passcode: undefined } : passcode ? { passcode } : {}),
      updatedBy: access.user._id,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { keyId: v.id("siteKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key || key.deletedAt) throw new Error("Key record not found");
    const access = await requireKeyManagementAccess(ctx, key.siteId);
    const now = Date.now();
    await ctx.db.patch(key._id, { deletedAt: now, updatedBy: access.user._id, updatedAt: now });
    return null;
  },
});
