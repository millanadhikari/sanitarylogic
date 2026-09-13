import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import schema from "./schema";
import {
  requireRosterManagementAccess,
  requireRosterReadAccess,
} from "./lib/authorization";
import {
  addRosterDays,
  assertRosterDate,
  calculateRosterRange,
  loadAssignedSiteEmployees,
  patternApplies,
  periodsOverlap,
  validateShiftInput,
} from "./lib/roster";

const shiftTypeV = v.union(v.literal("DAY"), v.literal("NIGHT"), v.literal("OTHER"));
const weekdayV = v.union(
  v.literal(0), v.literal(1), v.literal(2), v.literal(3),
  v.literal(4), v.literal(5), v.literal(6),
);
const sourceV = v.union(
  v.literal("CASUAL"),
  v.literal("ADDITIONAL"),
  v.literal("REPLACEMENT"),
);
const roleV = v.union(
  v.literal("SUPER_ADMIN"),
  v.literal("AREA_MANAGER"),
  v.literal("SITE_MANAGER"),
  v.literal("SUPERVISOR"),
);
const patternDayV = v.object({
  dayOfWeek: weekdayV,
  startTime: v.string(),
  endTime: v.string(),
  breakMinutes: v.number(),
});
const employeeSummaryV = v.object({
  _id: v.id("employees"),
  firstName: v.string(),
  lastName: v.string(),
  employeeNumber: v.optional(v.string()),
  employmentType: v.union(
    v.literal("FULL_TIME"), v.literal("PART_TIME"),
    v.literal("CASUAL"), v.literal("CONTRACTOR"),
  ),
});
const occurrenceV = v.object({
  occurrenceKey: v.string(),
  workDate: v.string(),
  employeeId: v.id("employees"),
  employeeName: v.string(),
  startTime: v.string(),
  endTime: v.string(),
  breakMinutes: v.number(),
  durationMinutes: v.number(),
  shiftType: shiftTypeV,
  shiftSource: v.union(
    v.literal("PERMANENT"), v.literal("CASUAL"), v.literal("ADDITIONAL"),
    v.literal("REPLACEMENT"), v.literal("OVERRIDE"),
  ),
  status: v.union(v.literal("SCHEDULED"), v.literal("CANCELLED")),
  patternId: v.optional(v.id("employeeShiftPatterns")),
  patternSetKey: v.optional(v.string()),
  rosterShiftId: v.optional(v.id("rosterShifts")),
  replacesEmployeeId: v.optional(v.id("employees")),
  replacesEmployeeName: v.optional(v.string()),
  reason: v.optional(v.string()),
  notes: v.optional(v.string()),
  overnight: v.boolean(),
});

type RosterCtx = QueryCtx | MutationCtx;
function cleanOptional(value?: string) {
  return value?.trim() || undefined;
}

async function requireAssignedEmployee(
  ctx: RosterCtx,
  site: Doc<"sites">,
  employeeId: Id<"employees">,
) {
  const employee = await ctx.db.get(employeeId);
  if (
    !employee || employee.deletedAt || employee.status !== "ACTIVE" ||
    employee.companyId !== site.companyId
  ) {
    throw new Error("Active employee not found in this company");
  }
  const assignment = await ctx.db
    .query("employeeSiteAssignments")
    .withIndex("by_employee_and_site", (q) =>
      q.eq("employeeId", employeeId).eq("siteId", site._id),
    )
    .first();
  if (!assignment || assignment.status !== "ACTIVE" || assignment.companyId !== site.companyId) {
    throw new Error("Employee must be actively assigned to this site first");
  }
  return employee;
}

export const getSetupData = query({
  args: { siteId: v.id("sites") },
  returns: v.object({
    role: roleV,
    canManage: v.boolean(),
    site: v.object({ _id: v.id("sites"), name: v.string() }),
    employees: v.array(employeeSummaryV),
    patterns: v.array(schema.doc("employeeShiftPatterns")),
  }),
  handler: async (ctx, args) => {
    const access = await requireRosterReadAccess(ctx, args.siteId);
    const [employees, patterns] = await Promise.all([
      loadAssignedSiteEmployees(ctx, access.site),
      ctx.db.query("employeeShiftPatterns")
        .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
        .take(1000),
    ]);
    return {
      role: access.role,
      canManage: access.role !== "SUPERVISOR",
      site: { _id: access.site._id, name: access.site.name },
      employees: employees
        .map(({ _id, firstName, lastName, employeeNumber, employmentType }) => ({
          _id, firstName, lastName, employeeNumber, employmentType,
        }))
        .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)),
      patterns,
    };
  },
});

export const getWeek = query({
  args: { siteId: v.id("sites"), weekStartDate: v.string() },
  returns: v.object({
    role: roleV,
    canManage: v.boolean(),
    siteName: v.string(),
    weekStartDate: v.string(),
    weekEndDate: v.string(),
    employees: v.array(employeeSummaryV),
    occurrences: v.array(occurrenceV),
    summary: v.object({
      permanentStaff: v.number(),
      casualAdditionalShifts: v.number(),
      dayShiftMinutes: v.number(),
      nightShiftMinutes: v.number(),
      scheduledMinutes: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    assertRosterDate(args.weekStartDate, "Week start");
    const access = await requireRosterReadAccess(ctx, args.siteId);
    const weekEndDate = addRosterDays(args.weekStartDate, 6);
    const { employees, occurrences } = await calculateRosterRange(
      ctx,
      access.site,
      args.weekStartDate,
      weekEndDate,
    );
    const scheduled = occurrences.filter((item) => item.status === "SCHEDULED");
    return {
      role: access.role,
      canManage: access.role !== "SUPERVISOR",
      siteName: access.site.name,
      weekStartDate: args.weekStartDate,
      weekEndDate,
      employees: employees.map(({ _id, firstName, lastName, employeeNumber, employmentType }) => ({
        _id, firstName, lastName, employeeNumber, employmentType,
      })),
      occurrences,
      summary: {
        permanentStaff: new Set(scheduled.filter((item) => item.shiftSource === "PERMANENT").map((item) => item.employeeId)).size,
        casualAdditionalShifts: scheduled.filter((item) => item.shiftSource === "CASUAL" || item.shiftSource === "ADDITIONAL").length,
        dayShiftMinutes: scheduled.filter((item) => item.shiftType === "DAY").reduce((sum, item) => sum + item.durationMinutes, 0),
        nightShiftMinutes: scheduled.filter((item) => item.shiftType === "NIGHT").reduce((sum, item) => sum + item.durationMinutes, 0),
        scheduledMinutes: scheduled.reduce((sum, item) => sum + item.durationMinutes, 0),
      },
    };
  },
});

export const savePermanentPattern = mutation({
  args: {
    siteId: v.id("sites"),
    patternSetKey: v.optional(v.string()),
    employeeId: v.id("employees"),
    name: v.optional(v.string()),
    shiftType: shiftTypeV,
    effectiveFrom: v.string(),
    effectiveTo: v.optional(v.string()),
    days: v.array(patternDayV),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const access = await requireRosterManagementAccess(ctx, args.siteId);
    await requireAssignedEmployee(ctx, access.site, args.employeeId);
    assertRosterDate(args.effectiveFrom, "Effective from");
    if (args.effectiveTo) {
      assertRosterDate(args.effectiveTo, "Effective to");
      if (args.effectiveTo < args.effectiveFrom) throw new Error("Effective to cannot be before effective from");
    }
    if (args.days.length < 1 || args.days.length > 7) throw new Error("Select at least one weekday");
    if (new Set(args.days.map((day) => day.dayOfWeek)).size !== args.days.length) {
      throw new Error("Each weekday can appear only once");
    }
    for (const day of args.days) validateShiftInput(day);
    const existingSet = args.patternSetKey
      ? await ctx.db.query("employeeShiftPatterns")
          .withIndex("by_site_and_patternSetKey", (q) =>
            q.eq("siteId", args.siteId).eq("patternSetKey", args.patternSetKey!),
          ).take(20)
      : [];
    if (args.patternSetKey && existingSet.length === 0) throw new Error("Permanent pattern not found");
    const patternSetKey = args.patternSetKey ?? `${args.employeeId}:${Date.now()}`;
    const activeEmployeePatterns = await ctx.db.query("employeeShiftPatterns")
      .withIndex("by_employee_and_status", (q) => q.eq("employeeId", args.employeeId).eq("status", "ACTIVE"))
      .take(100);
    for (const day of args.days) {
      const duplicate = activeEmployeePatterns.find((pattern) =>
        pattern.patternSetKey !== patternSetKey &&
        pattern.siteId === args.siteId &&
        pattern.dayOfWeek === day.dayOfWeek &&
        pattern.startTime === day.startTime &&
        pattern.endTime === day.endTime &&
        periodsOverlap(pattern.effectiveFrom, pattern.effectiveTo, args.effectiveFrom, args.effectiveTo),
      );
      if (duplicate) throw new Error("An identical active permanent shift already exists for this employee");
    }
    const now = Date.now();
    const incomingDays = new Set(args.days.map((day) => day.dayOfWeek));
    for (const existing of existingSet) {
      const next = args.days.find((day) => day.dayOfWeek === existing.dayOfWeek);
      if (!next) {
        await ctx.db.patch(existing._id, { status: "INACTIVE", updatedBy: access.user._id, updatedAt: now });
      } else {
        await ctx.db.patch(existing._id, {
          employeeId: args.employeeId,
          name: cleanOptional(args.name),
          shiftType: args.shiftType,
          startTime: next.startTime,
          endTime: next.endTime,
          breakMinutes: next.breakMinutes,
          effectiveFrom: args.effectiveFrom,
          effectiveTo: args.effectiveTo,
          status: "ACTIVE",
          updatedBy: access.user._id,
          updatedAt: now,
        });
      }
    }
    const existingDays = new Set(existingSet.map((row) => row.dayOfWeek));
    for (const day of args.days) {
      if (existingDays.has(day.dayOfWeek) && incomingDays.has(day.dayOfWeek)) continue;
      await ctx.db.insert("employeeShiftPatterns", {
        companyId: access.site.companyId,
        siteId: args.siteId,
        employeeId: args.employeeId,
        patternSetKey,
        name: cleanOptional(args.name),
        shiftType: args.shiftType,
        ...day,
        effectiveFrom: args.effectiveFrom,
        effectiveTo: args.effectiveTo,
        status: "ACTIVE",
        createdBy: access.user._id,
        updatedBy: access.user._id,
        createdAt: now,
        updatedAt: now,
      });
    }
    return patternSetKey;
  },
});

export const setPermanentPatternStatus = mutation({
  args: {
    siteId: v.id("sites"),
    patternSetKey: v.string(),
    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const access = await requireRosterManagementAccess(ctx, args.siteId);
    const rows = await ctx.db.query("employeeShiftPatterns")
      .withIndex("by_site_and_patternSetKey", (q) =>
        q.eq("siteId", args.siteId).eq("patternSetKey", args.patternSetKey),
      ).take(20);
    if (rows.length === 0) throw new Error("Permanent pattern not found");
    const now = Date.now();
    for (const row of rows) {
      await ctx.db.patch(row._id, { status: args.status, updatedBy: access.user._id, updatedAt: now });
    }
    return null;
  },
});

export const createDatedShift = mutation({
  args: {
    siteId: v.id("sites"), employeeId: v.id("employees"), workDate: v.string(),
    startTime: v.string(), endTime: v.string(), breakMinutes: v.number(),
    shiftType: shiftTypeV, shiftSource: sourceV,
    relatedPatternId: v.optional(v.id("employeeShiftPatterns")),
    replacesEmployeeId: v.optional(v.id("employees")),
    reason: v.optional(v.string()), notes: v.optional(v.string()),
  },
  returns: v.id("rosterShifts"),
  handler: async (ctx, args) => {
    const access = await requireRosterManagementAccess(ctx, args.siteId);
    await requireAssignedEmployee(ctx, access.site, args.employeeId);
    assertRosterDate(args.workDate, "Work date");
    validateShiftInput(args);
    let pattern: Doc<"employeeShiftPatterns"> | null = null;
    if (args.shiftSource === "REPLACEMENT") {
      if (!args.relatedPatternId || !args.replacesEmployeeId) {
        throw new Error("Replacement shifts must identify the permanent shift and employee being replaced");
      }
      pattern = await ctx.db.get(args.relatedPatternId);
      if (!pattern || pattern.siteId !== args.siteId || pattern.employeeId !== args.replacesEmployeeId || !patternApplies(pattern, args.workDate)) {
        throw new Error("The selected permanent occurrence cannot be replaced on this date");
      }
    } else if (args.relatedPatternId || args.replacesEmployeeId) {
      throw new Error("Only replacement shifts may reference a permanent pattern");
    }
    const now = Date.now();
    const values = {
      employeeId: args.employeeId, workDate: args.workDate, startTime: args.startTime,
      endTime: args.endTime, breakMinutes: args.breakMinutes, shiftType: args.shiftType,
      shiftSource: args.shiftSource, relatedPatternId: pattern?._id,
      replacesEmployeeId: pattern?.employeeId, reason: cleanOptional(args.reason),
      notes: cleanOptional(args.notes), status: "SCHEDULED" as const,
      updatedBy: access.user._id, updatedAt: now,
    };
    if (pattern) {
      const existing = await ctx.db.query("rosterShifts")
        .withIndex("by_relatedPattern_and_workDate", (q) =>
          q.eq("relatedPatternId", pattern!._id).eq("workDate", args.workDate),
        ).first();
      if (existing) {
        await ctx.db.patch(existing._id, values);
        return existing._id;
      }
    }
    return await ctx.db.insert("rosterShifts", {
      companyId: access.site.companyId, siteId: args.siteId, ...values,
      createdBy: access.user._id, createdAt: now,
    });
  },
});

export const overridePermanentOccurrence = mutation({
  args: {
    patternId: v.id("employeeShiftPatterns"), workDate: v.string(),
    action: v.union(v.literal("CANCEL"), v.literal("EDIT")),
    startTime: v.optional(v.string()), endTime: v.optional(v.string()),
    breakMinutes: v.optional(v.number()), shiftType: v.optional(shiftTypeV),
    reason: v.optional(v.string()), notes: v.optional(v.string()),
  },
  returns: v.id("rosterShifts"),
  handler: async (ctx, args) => {
    const pattern = await ctx.db.get(args.patternId);
    if (!pattern) throw new Error("Permanent pattern not found");
    const access = await requireRosterManagementAccess(ctx, pattern.siteId);
    assertRosterDate(args.workDate, "Work date");
    if (!patternApplies(pattern, args.workDate)) throw new Error("This pattern does not occur on the selected date");
    const startTime = args.startTime ?? pattern.startTime;
    const endTime = args.endTime ?? pattern.endTime;
    const breakMinutes = args.breakMinutes ?? pattern.breakMinutes;
    if (args.action === "EDIT" && (!args.startTime || !args.endTime)) {
      throw new Error("Edited occurrences require start and end times");
    }
    validateShiftInput({ startTime, endTime, breakMinutes });
    const existing = await ctx.db.query("rosterShifts")
      .withIndex("by_relatedPattern_and_workDate", (q) =>
        q.eq("relatedPatternId", pattern._id).eq("workDate", args.workDate),
      ).first();
    const now = Date.now();
    const values = {
      employeeId: pattern.employeeId, workDate: args.workDate, startTime, endTime,
      breakMinutes, shiftType: args.shiftType ?? pattern.shiftType,
      shiftSource: "OVERRIDE" as const, relatedPatternId: pattern._id,
      reason: cleanOptional(args.reason), notes: cleanOptional(args.notes),
      status: args.action === "CANCEL" ? "CANCELLED" as const : "SCHEDULED" as const,
      updatedBy: access.user._id, updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, values);
      return existing._id;
    }
    return await ctx.db.insert("rosterShifts", {
      companyId: pattern.companyId, siteId: pattern.siteId, ...values,
      createdBy: access.user._id, createdAt: now,
    });
  },
});

export const updateDatedShift = mutation({
  args: {
    rosterShiftId: v.id("rosterShifts"), employeeId: v.id("employees"),
    workDate: v.string(), startTime: v.string(), endTime: v.string(),
    breakMinutes: v.number(), shiftType: shiftTypeV,
    reason: v.optional(v.string()), notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.rosterShiftId);
    if (!shift) throw new Error("Roster shift not found");
    const access = await requireRosterManagementAccess(ctx, shift.siteId);
    await requireAssignedEmployee(ctx, access.site, args.employeeId);
    assertRosterDate(args.workDate, "Work date");
    validateShiftInput(args);
    if (shift.relatedPatternId && shift.workDate !== args.workDate) {
      throw new Error("A replacement or override must remain on its original occurrence date");
    }
    await ctx.db.patch(shift._id, {
      employeeId: args.employeeId, workDate: args.workDate,
      startTime: args.startTime, endTime: args.endTime,
      breakMinutes: args.breakMinutes, shiftType: args.shiftType,
      reason: cleanOptional(args.reason), notes: cleanOptional(args.notes),
      status: "SCHEDULED", updatedBy: access.user._id, updatedAt: Date.now(),
    });
    return null;
  },
});

export const cancelDatedShift = mutation({
  args: { rosterShiftId: v.id("rosterShifts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.rosterShiftId);
    if (!shift) throw new Error("Roster shift not found");
    const access = await requireRosterManagementAccess(ctx, shift.siteId);
    await ctx.db.patch(shift._id, {
      status: "CANCELLED", updatedBy: access.user._id, updatedAt: Date.now(),
    });
    return null;
  },
});
