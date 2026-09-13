import type { Doc, Id } from "@/convex/_generated/dataModel";

export type TimesheetStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
export type AttendanceType = "WORKED" | "SICK_LEAVE" | "ANNUAL_LEAVE" | "PERSONAL_LEAVE" | "LEAVE_WITHOUT_PAY" | "ABSENT";
export type TimesheetEmployee = { _id: Id<"employees">; firstName: string; lastName: string; employeeNumber?: string };
export type TimesheetSummaryRow = {
  _id: Id<"employeeTimesheets">; employeeId: Id<"employees">; employeeName: string; status: TimesheetStatus;
  rosteredMinutes: number; actualMinutes: number; varianceMinutes: number; leaveShifts: number;
  leaveSummary: Array<{ attendanceType: AttendanceType; shifts: number; scheduledMinutes: number }>;
};
export type TimesheetDetailEntry = {
  entry: Doc<"timesheetEntries">;
  replacementEmployeeName: string | null;
  replacingEmployeeName: string | null;
};
