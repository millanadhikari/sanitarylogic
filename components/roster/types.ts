import type { Id } from "@/convex/_generated/dataModel";

export type ShiftType = "DAY" | "NIGHT" | "OTHER";
export type ShiftSource = "PERMANENT" | "CASUAL" | "ADDITIONAL" | "REPLACEMENT" | "OVERRIDE";
export type RosterEmployee = {
  _id: Id<"employees">;
  firstName: string;
  lastName: string;
  employeeNumber?: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CASUAL" | "CONTRACTOR";
};
export type RosterPattern = {
  _id: Id<"employeeShiftPatterns">;
  employeeId: Id<"employees">;
  patternSetKey: string;
  name?: string;
  shiftType: ShiftType;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: "ACTIVE" | "INACTIVE";
};
export type RosterOccurrence = {
  occurrenceKey: string;
  workDate: string;
  employeeId: Id<"employees">;
  employeeName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  durationMinutes: number;
  shiftType: ShiftType;
  shiftSource: ShiftSource;
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
