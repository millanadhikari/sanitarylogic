import type { TimesheetStatus } from "./types";

export function TimesheetStatusBadge({ status, locked = false }: { status: TimesheetStatus; locked?: boolean }) {
  const classes = status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : status === "SUBMITTED" ? "bg-blue-100 text-blue-800" : status === "REJECTED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";
  return <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${classes}`}>{status}{locked ? " · Locked" : ""}</span>;
}
