import { addRosterDays, assertRosterDate, shiftDurationMinutes } from "./roster";

export type TimesheetPeriodType = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";

export function calculateTimesheetPeriod(input: {
  periodType: TimesheetPeriodType;
  referenceDate: string;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  fortnightAnchorDate?: string;
}) {
  assertRosterDate(input.referenceDate, "Reference date");
  if (input.periodType === "MONTHLY") {
    const [year, month] = input.referenceDate.split("-").map(Number);
    const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const periodEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    return { periodStart, periodEnd };
  }
  if (input.periodType === "FORTNIGHTLY") {
    if (!input.fortnightAnchorDate) throw new Error("Fortnightly cycles require an anchor date");
    assertRosterDate(input.fortnightAnchorDate, "Fortnight anchor date");
    const delta = daysBetween(input.fortnightAnchorDate, input.referenceDate);
    const periodIndex = Math.floor(delta / 14);
    const periodStart = addRosterDays(input.fortnightAnchorDate, periodIndex * 14);
    return { periodStart, periodEnd: addRosterDays(periodStart, 13) };
  }
  const weekday = new Date(`${input.referenceDate}T00:00:00Z`).getUTCDay();
  const offset = (weekday - input.weekStartsOn + 7) % 7;
  const periodStart = addRosterDays(input.referenceDate, -offset);
  return { periodStart, periodEnd: addRosterDays(periodStart, 6) };
}

export function calculateActualMinutes(start?: string, end?: string, breakMinutes?: number) {
  if (!start || !end) return undefined;
  return shiftDurationMinutes(start, end, breakMinutes ?? 0);
}

export function calculateVariance(actualMinutes: number | undefined, scheduledMinutes: number | undefined) {
  if (actualMinutes === undefined) return undefined;
  return actualMinutes - (scheduledMinutes ?? 0);
}

export function daysBetween(fromDate: string, toDate: string) {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000);
}
