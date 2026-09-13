import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function assertRosterDate(value: string, label = "Date") {
  if (!ISO_DATE.test(value)) throw new Error(`${label} must use YYYY-MM-DD`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is invalid`);
  }
}

export function assertRosterTime(value: string, label = "Time") {
  if (!LOCAL_TIME.test(value)) throw new Error(`${label} must use HH:mm`);
}

export function assertBreakMinutes(value: number) {
  if (!Number.isInteger(value) || value < 0 || value >= 24 * 60) {
    throw new Error("Break minutes must be a whole number between 0 and 1439");
  }
}

export function addRosterDays(date: string, amount: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

export function rosterWeekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function shiftDurationMinutes(startTime: string, endTime: string, breakMinutes: number) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end <= start) end += 24 * 60;
  const duration = end - start - breakMinutes;
  if (duration <= 0) throw new Error("Break must be shorter than the shift duration");
  return duration;
}

export function patternApplies(pattern: Doc<"employeeShiftPatterns">, date: string) {
  return pattern.status === "ACTIVE" &&
    pattern.dayOfWeek === rosterWeekday(date) &&
    pattern.effectiveFrom <= date &&
    (!pattern.effectiveTo || pattern.effectiveTo >= date);
}

export function periodsOverlap(
  fromA: string,
  toA: string | undefined,
  fromB: string,
  toB: string | undefined,
) {
  return fromA <= (toB ?? "9999-12-31") && fromB <= (toA ?? "9999-12-31");
}

export function validateShiftInput(input: {
  startTime: string;
  endTime: string;
  breakMinutes: number;
}) {
  assertRosterTime(input.startTime, "Start time");
  assertRosterTime(input.endTime, "End time");
  assertBreakMinutes(input.breakMinutes);
  return shiftDurationMinutes(input.startTime, input.endTime, input.breakMinutes);
}

type RosterDataCtx = QueryCtx | MutationCtx;

export type CalculatedRosterOccurrence = {
  occurrenceKey: string;
  workDate: string;
  employeeId: Id<"employees">;
  employeeName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  durationMinutes: number;
  shiftType: "DAY" | "NIGHT" | "OTHER";
  shiftSource: "PERMANENT" | "CASUAL" | "ADDITIONAL" | "REPLACEMENT" | "OVERRIDE";
  status: "SCHEDULED" | "CANCELLED";
  patternId?: Id<"employeeShiftPatterns">;
  patternSetKey?: string;
  rosterShiftId?: Id<"rosterShifts">;
  replacesEmployeeId?: Id<"employees">;
  replacesEmployeeName?: string;
  reason?: string;
  notes?: string;
  overnight: boolean;
};

export async function loadAssignedSiteEmployees(ctx: RosterDataCtx, site: Doc<"sites">) {
  const assignments = await ctx.db
    .query("employeeSiteAssignments")
    .withIndex("by_site", (q) => q.eq("siteId", site._id))
    .take(500);
  const employees = await Promise.all(
    assignments
      .filter((assignment) => assignment.status === "ACTIVE")
      .map((assignment) => ctx.db.get(assignment.employeeId)),
  );
  return employees.filter((employee): employee is Doc<"employees"> =>
    Boolean(employee && !employee.deletedAt && employee.status === "ACTIVE" && employee.companyId === site.companyId),
  );
}

export async function calculateRosterRange(
  ctx: RosterDataCtx,
  site: Doc<"sites">,
  fromDate: string,
  toDate: string,
) {
  assertRosterDate(fromDate, "Roster start");
  assertRosterDate(toDate, "Roster end");
  if (toDate < fromDate) throw new Error("Roster end cannot be before start");
  const rangeDays = Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000) + 1;
  if (rangeDays > 31) throw new Error("Roster calculation range cannot exceed 31 days");
  const [employees, patterns, datedShifts] = await Promise.all([
    loadAssignedSiteEmployees(ctx, site),
    ctx.db.query("employeeShiftPatterns")
      .withIndex("by_site_and_status", (q) => q.eq("siteId", site._id).eq("status", "ACTIVE"))
      .take(1000),
    ctx.db.query("rosterShifts")
      .withIndex("by_site_and_workDate", (q) =>
        q.eq("siteId", site._id).gte("workDate", fromDate).lte("workDate", toDate),
      )
      .take(1000),
  ]);
  const employeeById = new Map(employees.map((employee) => [employee._id, employee]));
  const exceptionKeys = new Set(
    datedShifts.filter((shift) => shift.relatedPatternId).map((shift) => `${shift.relatedPatternId}:${shift.workDate}`),
  );
  const occurrences: CalculatedRosterOccurrence[] = [];

  for (let workDate = fromDate; workDate <= toDate; workDate = addRosterDays(workDate, 1)) {
    for (const pattern of patterns) {
      const employee = employeeById.get(pattern.employeeId);
      if (!employee || !patternApplies(pattern, workDate) || exceptionKeys.has(`${pattern._id}:${workDate}`)) continue;
      occurrences.push({
        occurrenceKey: `pattern:${pattern._id}:${workDate}`,
        workDate,
        employeeId: employee._id,
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        startTime: pattern.startTime,
        endTime: pattern.endTime,
        breakMinutes: pattern.breakMinutes,
        durationMinutes: shiftDurationMinutes(pattern.startTime, pattern.endTime, pattern.breakMinutes),
        shiftType: pattern.shiftType,
        shiftSource: "PERMANENT",
        status: "SCHEDULED",
        patternId: pattern._id,
        patternSetKey: pattern.patternSetKey,
        overnight: pattern.endTime <= pattern.startTime,
      });
    }
  }
  for (const shift of datedShifts) {
    const employee = employeeById.get(shift.employeeId);
    if (!employee) continue;
    const replaces = shift.replacesEmployeeId ? employeeById.get(shift.replacesEmployeeId) : undefined;
    occurrences.push({
      occurrenceKey: `shift:${shift._id}`,
      workDate: shift.workDate,
      employeeId: employee._id,
      employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMinutes: shift.breakMinutes,
      durationMinutes: shiftDurationMinutes(shift.startTime, shift.endTime, shift.breakMinutes),
      shiftType: shift.shiftType,
      shiftSource: shift.shiftSource,
      status: shift.status,
      patternId: shift.relatedPatternId,
      patternSetKey: shift.relatedPatternId
        ? patterns.find((pattern) => pattern._id === shift.relatedPatternId)?.patternSetKey
        : undefined,
      rosterShiftId: shift._id,
      replacesEmployeeId: shift.replacesEmployeeId,
      replacesEmployeeName: replaces ? `${replaces.firstName} ${replaces.lastName}`.trim() : undefined,
      reason: shift.reason,
      notes: shift.notes,
      overnight: shift.endTime <= shift.startTime,
    });
  }
  occurrences.sort((a, b) =>
    a.workDate.localeCompare(b.workDate) || a.startTime.localeCompare(b.startTime) || a.employeeName.localeCompare(b.employeeName),
  );
  return { employees, patterns, datedShifts, occurrences };
}
