import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import schema from "./schema";
import {
  requireTimesheetApprovalAccess,
  requireTimesheetManagementAccess,
  requireTimesheetReadAccess,
} from "./lib/authorization";
import {
  assertRosterDate,
  calculateRosterRange,
  loadAssignedSiteEmployees,
  patternApplies,
  validateShiftInput,
} from "./lib/roster";
import {
  calculateActualMinutes,
  calculateTimesheetPeriod,
  calculateVariance,
  type TimesheetPeriodType,
} from "./lib/timesheets";

const attendanceV = v.union(
  v.literal("WORKED"), v.literal("SICK_LEAVE"), v.literal("ANNUAL_LEAVE"),
  v.literal("PERSONAL_LEAVE"), v.literal("LEAVE_WITHOUT_PAY"), v.literal("ABSENT"),
);
const statusV = v.union(v.literal("DRAFT"), v.literal("SUBMITTED"), v.literal("APPROVED"), v.literal("REJECTED"));
const roleV = v.union(v.literal("SUPER_ADMIN"), v.literal("AREA_MANAGER"), v.literal("SITE_MANAGER"), v.literal("SUPERVISOR"));
const shiftTypeV = v.union(v.literal("DAY"), v.literal("NIGHT"), v.literal("OTHER"));
const employeeSummaryV = v.object({ _id: v.id("employees"), firstName: v.string(), lastName: v.string(), employeeNumber: v.optional(v.string()) });
type Ctx = QueryCtx | MutationCtx;

function clean(value?: string) { return value?.trim() || undefined; }
function fullName(employee: Pick<Doc<"employees">, "firstName" | "lastName">) { return `${employee.firstName} ${employee.lastName}`.trim(); }

async function settingsFor(ctx: Ctx, siteId: Id<"sites">) {
  const settings = await ctx.db.query("siteTimesheetSettings").withIndex("by_site", (q) => q.eq("siteId", siteId)).unique();
  return settings?.status === "ACTIVE"
    ? { periodType: settings.periodType, weekStartsOn: settings.weekStartsOn, fortnightAnchorDate: settings.fortnightAnchorDate }
    : { periodType: "WEEKLY" as const, weekStartsOn: 1 as const, fortnightAnchorDate: undefined };
}

async function requireAssignedEmployee(ctx: Ctx, site: Doc<"sites">, employeeId: Id<"employees">) {
  const employee = await ctx.db.get(employeeId);
  if (!employee || employee.deletedAt || employee.status !== "ACTIVE" || employee.companyId !== site.companyId) throw new Error("Active employee not found");
  const assignment = await ctx.db.query("employeeSiteAssignments")
    .withIndex("by_employee_and_site", (q) => q.eq("employeeId", employeeId).eq("siteId", site._id)).first();
  if (!assignment || assignment.status !== "ACTIVE" || assignment.companyId !== site.companyId) throw new Error("Employee must be actively assigned to this site");
  return employee;
}

async function getOrCreateTimesheet(ctx: MutationCtx, values: {
  companyId: Id<"companies">; siteId: Id<"sites">; employeeId: Id<"employees">;
  periodType: TimesheetPeriodType; periodStart: string; periodEnd: string; userId: Id<"users">;
}) {
  const existing = await ctx.db.query("employeeTimesheets")
    .withIndex("by_employee_and_period", (q) => q.eq("employeeId", values.employeeId).eq("siteId", values.siteId).eq("periodStart", values.periodStart).eq("periodEnd", values.periodEnd))
    .unique();
  if (existing) return existing;
  const now = Date.now();
  const id = await ctx.db.insert("employeeTimesheets", {
    companyId: values.companyId, siteId: values.siteId, employeeId: values.employeeId,
    periodType: values.periodType, periodStart: values.periodStart, periodEnd: values.periodEnd,
    status: "DRAFT", createdBy: values.userId, updatedBy: values.userId, createdAt: now, updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Could not create timesheet");
  return created;
}

async function insertRosterEntryIfMissing(ctx: MutationCtx, timesheet: Doc<"employeeTimesheets">, occurrence: Awaited<ReturnType<typeof calculateRosterRange>>["occurrences"][number], userId: Id<"users">, attendance: Doc<"timesheetEntries">["attendanceType"] = "WORKED") {
  const sourceType = occurrence.shiftSource === "PERMANENT" ? "PERMANENT_PATTERN" as const : "ROSTER_SHIFT" as const;
  const sourceKey = sourceType === "PERMANENT_PATTERN" ? `PATTERN:${occurrence.patternId}:${occurrence.workDate}` : `ROSTER:${occurrence.rosterShiftId}`;
  const existing = await ctx.db.query("timesheetEntries")
    .withIndex("by_timesheet_and_sourceKey", (q) => q.eq("timesheetId", timesheet._id).eq("sourceKey", sourceKey)).unique();
  if (existing) return existing;
  const actualMinutes = attendance === "WORKED" ? occurrence.durationMinutes : 0;
  const now = Date.now();
  const id = await ctx.db.insert("timesheetEntries", {
    companyId: timesheet.companyId, siteId: timesheet.siteId, employeeId: timesheet.employeeId, timesheetId: timesheet._id,
    workDate: occurrence.workDate, sourceKey, sourceType,
    sourcePatternId: sourceType === "PERMANENT_PATTERN" ? occurrence.patternId : undefined,
    sourceRosterShiftId: sourceType === "ROSTER_SHIFT" ? occurrence.rosterShiftId : undefined,
    shiftType: occurrence.shiftType,
    scheduledStart: occurrence.startTime, scheduledEnd: occurrence.endTime,
    scheduledBreakMinutes: occurrence.breakMinutes, scheduledMinutes: occurrence.durationMinutes,
    actualStart: attendance === "WORKED" ? occurrence.startTime : undefined,
    actualEnd: attendance === "WORKED" ? occurrence.endTime : undefined,
    actualBreakMinutes: attendance === "WORKED" ? occurrence.breakMinutes : undefined,
    actualMinutes, varianceMinutes: actualMinutes - occurrence.durationMinutes,
    attendanceType: attendance, notes: occurrence.notes ?? occurrence.reason,
    createdBy: userId, updatedBy: userId, createdAt: now, updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Could not create timesheet entry");
  return created;
}

async function assertEditableTimesheet(ctx: MutationCtx, timesheetId: Id<"employeeTimesheets">) {
  const timesheet = await ctx.db.get(timesheetId);
  if (!timesheet) throw new Error("Timesheet not found");
  const access = await requireTimesheetManagementAccess(ctx, timesheet.siteId);
  if (timesheet.companyId !== access.site.companyId) throw new Error("Timesheet company relationship is invalid");
  if (timesheet.status === "APPROVED") throw new Error("Approved timesheets are locked. Reopen the timesheet before editing.");
  if (timesheet.status === "SUBMITTED") throw new Error("Submitted timesheets must be rejected before editing");
  return { timesheet, access };
}

export const getPeriodOverview = query({
  args: { siteId: v.id("sites"), referenceDate: v.string() },
  returns: v.object({
    role: roleV, canManage: v.boolean(), canApprove: v.boolean(), siteName: v.string(),
    periodType: v.union(v.literal("WEEKLY"), v.literal("FORTNIGHTLY"), v.literal("MONTHLY")),
    periodStart: v.string(), periodEnd: v.string(), employees: v.array(employeeSummaryV),
    timesheets: v.array(v.object({
      _id: v.id("employeeTimesheets"), employeeId: v.id("employees"), employeeName: v.string(), status: statusV,
      rosteredMinutes: v.number(), actualMinutes: v.number(), varianceMinutes: v.number(),
      leaveShifts: v.number(), leaveSummary: v.array(v.object({ attendanceType: attendanceV, shifts: v.number(), scheduledMinutes: v.number() })),
    })),
  }),
  handler: async (ctx, args) => {
    const access = await requireTimesheetReadAccess(ctx, args.siteId);
    const settings = await settingsFor(ctx, args.siteId);
    const period = calculateTimesheetPeriod({ ...settings, referenceDate: args.referenceDate });
    const [timesheets, employees, entries] = await Promise.all([
      ctx.db.query("employeeTimesheets").withIndex("by_site_and_period", (q) => q.eq("siteId", args.siteId).eq("periodStart", period.periodStart).eq("periodEnd", period.periodEnd)).take(500),
      loadAssignedSiteEmployees(ctx, access.site),
      ctx.db.query("timesheetEntries").withIndex("by_site_and_workDate", (q) => q.eq("siteId", args.siteId).gte("workDate", period.periodStart).lte("workDate", period.periodEnd)).take(5000),
    ]);
    const employeeById = new Map(employees.map((employee) => [employee._id, employee]));
    const items = timesheets.map((timesheet) => {
      const employee = employeeById.get(timesheet.employeeId);
      const rows = entries.filter((entry) => entry.timesheetId === timesheet._id);
      const leave = new Map<Doc<"timesheetEntries">["attendanceType"], { shifts: number; scheduledMinutes: number }>();
      for (const row of rows.filter((entry) => entry.attendanceType !== "WORKED")) {
        const current = leave.get(row.attendanceType) ?? { shifts: 0, scheduledMinutes: 0 };
        leave.set(row.attendanceType, { shifts: current.shifts + 1, scheduledMinutes: current.scheduledMinutes + (row.scheduledMinutes ?? 0) });
      }
      const rosteredMinutes = rows.reduce((sum, row) => sum + (row.scheduledMinutes ?? 0), 0);
      const actualMinutes = rows.reduce((sum, row) => sum + (row.actualMinutes ?? 0), 0);
      return {
        _id: timesheet._id, employeeId: timesheet.employeeId,
        employeeName: employee ? fullName(employee) : "Former employee", status: timesheet.status,
        rosteredMinutes, actualMinutes, varianceMinutes: actualMinutes - rosteredMinutes,
        leaveShifts: [...leave.values()].reduce((sum, item) => sum + item.shifts, 0),
        leaveSummary: [...leave].map(([attendanceType, value]) => ({ attendanceType, ...value })),
      };
    }).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    return {
      role: access.role, canManage: access.role !== "SUPERVISOR",
      canApprove: access.role === "SUPER_ADMIN" || access.role === "AREA_MANAGER",
      siteName: access.site.name, periodType: settings.periodType, ...period,
      employees: employees.map(({ _id, firstName, lastName, employeeNumber }) => ({ _id, firstName, lastName, employeeNumber })),
      timesheets: items,
    };
  },
});

export const getDetail = query({
  args: { timesheetId: v.id("employeeTimesheets") },
  returns: v.object({
    role: roleV, canEdit: v.boolean(), canApprove: v.boolean(), canReopen: v.boolean(),
    employeeName: v.string(), timesheet: schema.doc("employeeTimesheets"),
    entries: v.array(v.object({ entry: schema.doc("timesheetEntries"), replacementEmployeeName: v.union(v.string(), v.null()), replacingEmployeeName: v.union(v.string(), v.null()) })),
  }),
  handler: async (ctx, args) => {
    const timesheet = await ctx.db.get(args.timesheetId);
    if (!timesheet) throw new Error("Timesheet not found");
    const access = await requireTimesheetReadAccess(ctx, timesheet.siteId);
    if (timesheet.companyId !== access.site.companyId) throw new Error("Timesheet company relationship is invalid");
    const [employee, entries] = await Promise.all([
      ctx.db.get(timesheet.employeeId),
      ctx.db.query("timesheetEntries").withIndex("by_timesheet", (q) => q.eq("timesheetId", timesheet._id)).take(500),
    ]);
    const enriched = await Promise.all(entries.map(async (entry) => {
      const replacement = entry.replacementEmployeeId ? await ctx.db.get(entry.replacementEmployeeId) : null;
      let replacingEmployeeName: string | null = null;
      if (entry.sourceRosterShiftId) {
        const rosterShift = await ctx.db.get(entry.sourceRosterShiftId);
        if (rosterShift?.replacesEmployeeId) {
          const replaced = await ctx.db.get(rosterShift.replacesEmployeeId);
          replacingEmployeeName = replaced ? fullName(replaced) : null;
        }
      }
      return { entry, replacementEmployeeName: replacement ? fullName(replacement) : null, replacingEmployeeName };
    }));
    return {
      role: access.role,
      canEdit: access.role !== "SUPERVISOR" && timesheet.status !== "APPROVED" && timesheet.status !== "SUBMITTED",
      canApprove: (access.role === "SUPER_ADMIN" || access.role === "AREA_MANAGER") && timesheet.status === "SUBMITTED",
      canReopen: (access.role === "SUPER_ADMIN" || access.role === "AREA_MANAGER") && timesheet.status === "APPROVED",
      employeeName: employee ? fullName(employee) : "Former employee", timesheet,
      entries: enriched.sort((a, b) => a.entry.workDate.localeCompare(b.entry.workDate) || (a.entry.scheduledStart ?? a.entry.actualStart ?? "").localeCompare(b.entry.scheduledStart ?? b.entry.actualStart ?? "")),
    };
  },
});

export const generateDrafts = mutation({
  args: { siteId: v.id("sites"), referenceDate: v.string() },
  returns: v.object({ createdTimesheets: v.number(), createdEntries: v.number(), periodStart: v.string(), periodEnd: v.string() }),
  handler: async (ctx, args) => {
    const access = await requireTimesheetManagementAccess(ctx, args.siteId);
    const settings = await settingsFor(ctx, args.siteId);
    const period = calculateTimesheetPeriod({ ...settings, referenceDate: args.referenceDate });
    const roster = await calculateRosterRange(ctx, access.site, period.periodStart, period.periodEnd);
    const before = await ctx.db.query("employeeTimesheets").withIndex("by_site_and_period", (q) => q.eq("siteId", args.siteId).eq("periodStart", period.periodStart).eq("periodEnd", period.periodEnd)).take(500);
    let createdEntries = 0;
    const timesheetByEmployee = new Map(before.map((item) => [item.employeeId, item]));
    async function timesheetFor(employeeId: Id<"employees">) {
      const cached = timesheetByEmployee.get(employeeId);
      if (cached) return cached;
      const created = await getOrCreateTimesheet(ctx, { companyId: access.site.companyId, siteId: args.siteId, employeeId, periodType: settings.periodType, ...period, userId: access.user._id });
      timesheetByEmployee.set(employeeId, created);
      return created;
    }
    for (const occurrence of roster.occurrences) {
      if (occurrence.status === "CANCELLED" && occurrence.patternId) {
        const sheet = await timesheetFor(occurrence.employeeId);
        if (sheet.status === "APPROVED" || sheet.status === "SUBMITTED") continue;
        const key = `PATTERN:${occurrence.patternId}:${occurrence.workDate}`;
        const existing = await ctx.db.query("timesheetEntries").withIndex("by_timesheet_and_sourceKey", (q) => q.eq("timesheetId", sheet._id).eq("sourceKey", key)).unique();
        if (!existing) { await insertRosterEntryIfMissing(ctx, sheet, { ...occurrence, shiftSource: "PERMANENT", rosterShiftId: undefined }, access.user._id, "ABSENT"); createdEntries += 1; }
        continue;
      }
      if (occurrence.status !== "SCHEDULED") continue;
      if (occurrence.shiftSource === "REPLACEMENT" && occurrence.patternId && occurrence.replacesEmployeeId && occurrence.rosterShiftId) {
        const pattern = await ctx.db.get(occurrence.patternId);
        if (pattern) {
          const originalSheet = await timesheetFor(occurrence.replacesEmployeeId);
          if (originalSheet.status === "APPROVED" || originalSheet.status === "SUBMITTED") continue;
          const originalOccurrence = { ...occurrence, employeeId: occurrence.replacesEmployeeId, employeeName: occurrence.replacesEmployeeName ?? "Employee", startTime: pattern.startTime, endTime: pattern.endTime, breakMinutes: pattern.breakMinutes, durationMinutes: validateShiftInput(pattern), shiftType: pattern.shiftType, shiftSource: "PERMANENT" as const, rosterShiftId: undefined };
          const original = await insertRosterEntryIfMissing(ctx, originalSheet, originalOccurrence, access.user._id, "ABSENT");
          if (!original.replacementRosterShiftId) await ctx.db.patch(original._id, { replacementEmployeeId: occurrence.employeeId, replacementRosterShiftId: occurrence.rosterShiftId, updatedBy: access.user._id, updatedAt: Date.now() });
        }
      }
      const sheet = await timesheetFor(occurrence.employeeId);
      if (sheet.status === "APPROVED" || sheet.status === "SUBMITTED") continue;
      const key = occurrence.shiftSource === "PERMANENT" ? `PATTERN:${occurrence.patternId}:${occurrence.workDate}` : `ROSTER:${occurrence.rosterShiftId}`;
      const existing = await ctx.db.query("timesheetEntries").withIndex("by_timesheet_and_sourceKey", (q) => q.eq("timesheetId", sheet._id).eq("sourceKey", key)).unique();
      if (!existing) { await insertRosterEntryIfMissing(ctx, sheet, occurrence, access.user._id); createdEntries += 1; }
    }
    return { createdTimesheets: timesheetByEmployee.size - before.length, createdEntries, ...period };
  },
});

export const updateEntry = mutation({
  args: {
    entryId: v.id("timesheetEntries"), attendanceType: attendanceV,
    actualStart: v.optional(v.string()), actualEnd: v.optional(v.string()), actualBreakMinutes: v.optional(v.number()),
    leaveNotes: v.optional(v.string()), notes: v.optional(v.string()),
    replacement: v.optional(v.object({ employeeId: v.id("employees"), startTime: v.string(), endTime: v.string(), breakMinutes: v.number(), reason: v.optional(v.string()) })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Timesheet entry not found");
    const { timesheet, access } = await assertEditableTimesheet(ctx, entry.timesheetId);
    if (entry.siteId !== timesheet.siteId || entry.employeeId !== timesheet.employeeId || entry.companyId !== timesheet.companyId) throw new Error("Timesheet entry relationship is invalid");
    const now = Date.now();
    const replacementChanged = Boolean(
      entry.replacementEmployeeId &&
      (!args.replacement || args.replacement.employeeId !== entry.replacementEmployeeId),
    );
    if (replacementChanged && entry.replacementRosterShiftId && entry.replacementEmployeeId) {
      const oldReplacementSheet = await ctx.db.query("employeeTimesheets")
        .withIndex("by_employee_and_period", (q) => q.eq("employeeId", entry.replacementEmployeeId!).eq("siteId", timesheet.siteId).eq("periodStart", timesheet.periodStart).eq("periodEnd", timesheet.periodEnd))
        .unique();
      if (oldReplacementSheet && oldReplacementSheet.status !== "APPROVED" && oldReplacementSheet.status !== "SUBMITTED") {
        const oldReplacementEntry = await ctx.db.query("timesheetEntries")
          .withIndex("by_timesheet_and_sourceKey", (q) => q.eq("timesheetId", oldReplacementSheet._id).eq("sourceKey", `ROSTER:${entry.replacementRosterShiftId}`))
          .unique();
        if (oldReplacementEntry) await ctx.db.patch(oldReplacementEntry._id, {
          attendanceType: "ABSENT", actualStart: undefined, actualEnd: undefined,
          actualBreakMinutes: undefined, actualMinutes: 0,
          varianceMinutes: -(oldReplacementEntry.scheduledMinutes ?? 0),
          notes: "Replacement cancelled or reassigned", updatedBy: access.user._id, updatedAt: now,
        });
      }
      if (!args.replacement) {
        const oldRosterShift = await ctx.db.get(entry.replacementRosterShiftId);
        if (oldRosterShift && oldRosterShift.siteId === timesheet.siteId) {
          await ctx.db.patch(oldRosterShift._id, { status: "CANCELLED", updatedBy: access.user._id, updatedAt: now });
        }
      }
    }
    if (args.attendanceType === "WORKED") {
      const actualMinutes = calculateActualMinutes(args.actualStart, args.actualEnd, args.actualBreakMinutes);
      if (actualMinutes === undefined) throw new Error("Worked entries require actual start and finish times");
      if (args.replacement) throw new Error("Worked entries cannot have a leave replacement");
      await ctx.db.patch(entry._id, { attendanceType: "WORKED", actualStart: args.actualStart, actualEnd: args.actualEnd, actualBreakMinutes: args.actualBreakMinutes ?? 0, actualMinutes, varianceMinutes: calculateVariance(actualMinutes, entry.scheduledMinutes), replacementEmployeeId: undefined, replacementRosterShiftId: undefined, leaveNotes: undefined, notes: clean(args.notes), updatedBy: access.user._id, updatedAt: now });
      return null;
    }
    let replacementEmployeeId: Id<"employees"> | undefined;
    let replacementRosterShiftId: Id<"rosterShifts"> | undefined;
    if (args.replacement) {
      if (!entry.sourcePatternId) throw new Error("Only permanent-pattern entries support automatic replacement creation");
      const replacementEmployee = await requireAssignedEmployee(ctx, access.site, args.replacement.employeeId);
      const pattern = await ctx.db.get(entry.sourcePatternId);
      if (!pattern || pattern.siteId !== timesheet.siteId || pattern.employeeId !== entry.employeeId || !patternApplies(pattern, entry.workDate)) throw new Error("Permanent shift relationship is invalid");
      validateShiftInput({ startTime: args.replacement.startTime, endTime: args.replacement.endTime, breakMinutes: args.replacement.breakMinutes });
      const existingRosterShift = await ctx.db.query("rosterShifts").withIndex("by_relatedPattern_and_workDate", (q) => q.eq("relatedPatternId", pattern._id).eq("workDate", entry.workDate)).first();
      const rosterValues = { employeeId: replacementEmployee._id, startTime: args.replacement.startTime, endTime: args.replacement.endTime, breakMinutes: args.replacement.breakMinutes, shiftType: pattern.shiftType, shiftSource: "REPLACEMENT" as const, replacesEmployeeId: entry.employeeId, reason: clean(args.replacement.reason), status: "SCHEDULED" as const, updatedBy: access.user._id, updatedAt: now };
      if (existingRosterShift) { await ctx.db.patch(existingRosterShift._id, rosterValues); replacementRosterShiftId = existingRosterShift._id; }
      else replacementRosterShiftId = await ctx.db.insert("rosterShifts", { companyId: timesheet.companyId, siteId: timesheet.siteId, workDate: entry.workDate, relatedPatternId: pattern._id, ...rosterValues, createdBy: access.user._id, createdAt: now });
      replacementEmployeeId = replacementEmployee._id;
      const replacementSheet = await getOrCreateTimesheet(ctx, { companyId: timesheet.companyId, siteId: timesheet.siteId, employeeId: replacementEmployee._id, periodType: timesheet.periodType, periodStart: timesheet.periodStart, periodEnd: timesheet.periodEnd, userId: access.user._id });
      if (replacementSheet.status === "APPROVED" || replacementSheet.status === "SUBMITTED") throw new Error("The replacement employee's timesheet is locked");
      const replacementOccurrence = { occurrenceKey: `shift:${replacementRosterShiftId}`, workDate: entry.workDate, employeeId: replacementEmployee._id, employeeName: fullName(replacementEmployee), startTime: args.replacement.startTime, endTime: args.replacement.endTime, breakMinutes: args.replacement.breakMinutes, durationMinutes: validateShiftInput({ startTime: args.replacement.startTime, endTime: args.replacement.endTime, breakMinutes: args.replacement.breakMinutes }), shiftType: pattern.shiftType, shiftSource: "REPLACEMENT" as const, status: "SCHEDULED" as const, patternId: pattern._id, rosterShiftId: replacementRosterShiftId, replacesEmployeeId: entry.employeeId, overnight: args.replacement.endTime <= args.replacement.startTime };
      const replacementEntry = await insertRosterEntryIfMissing(ctx, replacementSheet, replacementOccurrence, access.user._id);
      await ctx.db.patch(replacementEntry._id, {
        scheduledStart: args.replacement.startTime, scheduledEnd: args.replacement.endTime,
        scheduledBreakMinutes: args.replacement.breakMinutes,
        scheduledMinutes: replacementOccurrence.durationMinutes,
        varianceMinutes: calculateVariance(replacementEntry.actualMinutes, replacementOccurrence.durationMinutes),
        updatedBy: access.user._id, updatedAt: now,
      });
    }
    await ctx.db.patch(entry._id, { attendanceType: args.attendanceType, actualStart: undefined, actualEnd: undefined, actualBreakMinutes: undefined, actualMinutes: 0, varianceMinutes: -(entry.scheduledMinutes ?? 0), replacementEmployeeId, replacementRosterShiftId, leaveNotes: clean(args.leaveNotes), notes: clean(args.notes), updatedBy: access.user._id, updatedAt: now });
    return null;
  },
});

export const addUnscheduledTime = mutation({
  args: { siteId: v.id("sites"), employeeId: v.id("employees"), referenceDate: v.string(), workDate: v.string(), actualStart: v.string(), actualEnd: v.string(), actualBreakMinutes: v.number(), shiftType: shiftTypeV, notes: v.optional(v.string()) },
  returns: v.id("timesheetEntries"),
  handler: async (ctx, args) => {
    const access = await requireTimesheetManagementAccess(ctx, args.siteId);
    await requireAssignedEmployee(ctx, access.site, args.employeeId);
    assertRosterDate(args.workDate, "Work date");
    const actualMinutes = validateShiftInput({ startTime: args.actualStart, endTime: args.actualEnd, breakMinutes: args.actualBreakMinutes });
    const settings = await settingsFor(ctx, args.siteId);
    const period = calculateTimesheetPeriod({ ...settings, referenceDate: args.referenceDate });
    if (args.workDate < period.periodStart || args.workDate > period.periodEnd) throw new Error("Unscheduled work date must be inside the selected period");
    const timesheet = await getOrCreateTimesheet(ctx, { companyId: access.site.companyId, siteId: args.siteId, employeeId: args.employeeId, periodType: settings.periodType, ...period, userId: access.user._id });
    if (timesheet.status === "APPROVED" || timesheet.status === "SUBMITTED") throw new Error("This timesheet is locked");
    const now = Date.now();
    return await ctx.db.insert("timesheetEntries", { companyId: timesheet.companyId, siteId: timesheet.siteId, employeeId: args.employeeId, timesheetId: timesheet._id, workDate: args.workDate, sourceKey: `UNSCHEDULED:${now}:${args.employeeId}`, sourceType: "UNSCHEDULED", shiftType: args.shiftType, scheduledMinutes: 0, actualStart: args.actualStart, actualEnd: args.actualEnd, actualBreakMinutes: args.actualBreakMinutes, actualMinutes, varianceMinutes: actualMinutes, attendanceType: "WORKED", notes: clean(args.notes), createdBy: access.user._id, updatedBy: access.user._id, createdAt: now, updatedAt: now });
  },
});

export const submit = mutation({ args: { timesheetId: v.id("employeeTimesheets") }, returns: v.null(), handler: async (ctx, args) => { const { timesheet, access } = await assertEditableTimesheet(ctx, args.timesheetId); if (timesheet.status !== "DRAFT" && timesheet.status !== "REJECTED") throw new Error("Only draft or rejected timesheets can be submitted"); const now = Date.now(); await ctx.db.patch(timesheet._id, { status: "SUBMITTED", submittedAt: now, submittedBy: access.user._id, rejectionReason: undefined, updatedBy: access.user._id, updatedAt: now }); return null; } });
export const approve = mutation({ args: { timesheetId: v.id("employeeTimesheets") }, returns: v.null(), handler: async (ctx, args) => { const timesheet = await ctx.db.get(args.timesheetId); if (!timesheet) throw new Error("Timesheet not found"); const access = await requireTimesheetApprovalAccess(ctx, timesheet.siteId); if (timesheet.companyId !== access.site.companyId) throw new Error("Timesheet company relationship is invalid"); if (timesheet.status !== "SUBMITTED") throw new Error("Only submitted timesheets can be approved"); const now = Date.now(); await ctx.db.patch(timesheet._id, { status: "APPROVED", approvedAt: now, approvedBy: access.user._id, updatedBy: access.user._id, updatedAt: now }); return null; } });
export const reject = mutation({ args: { timesheetId: v.id("employeeTimesheets"), reason: v.string() }, returns: v.null(), handler: async (ctx, args) => { const timesheet = await ctx.db.get(args.timesheetId); if (!timesheet) throw new Error("Timesheet not found"); const access = await requireTimesheetApprovalAccess(ctx, timesheet.siteId); if (timesheet.companyId !== access.site.companyId) throw new Error("Timesheet company relationship is invalid"); if (timesheet.status !== "SUBMITTED") throw new Error("Only submitted timesheets can be rejected"); const reason = args.reason.trim(); if (!reason) throw new Error("A rejection reason is required"); const now = Date.now(); await ctx.db.patch(timesheet._id, { status: "REJECTED", rejectedAt: now, rejectedBy: access.user._id, rejectionReason: reason, updatedBy: access.user._id, updatedAt: now }); return null; } });
export const reopen = mutation({ args: { timesheetId: v.id("employeeTimesheets") }, returns: v.null(), handler: async (ctx, args) => { const timesheet = await ctx.db.get(args.timesheetId); if (!timesheet) throw new Error("Timesheet not found"); const access = await requireTimesheetApprovalAccess(ctx, timesheet.siteId); if (timesheet.companyId !== access.site.companyId) throw new Error("Timesheet company relationship is invalid"); if (timesheet.status !== "APPROVED") throw new Error("Only approved timesheets can be reopened"); const now = Date.now(); await ctx.db.patch(timesheet._id, { status: "DRAFT", reopenedAt: now, reopenedBy: access.user._id, approvedAt: undefined, approvedBy: undefined, updatedBy: access.user._id, updatedAt: now }); return null; } });
