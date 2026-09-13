import type { TimesheetDetailEntry } from "./types";
import { formatMinutes } from "./timesheet-summary";

export function LeaveSummary({ entries }: { entries: TimesheetDetailEntry[] }) {
  const types = ["SICK_LEAVE", "ANNUAL_LEAVE", "PERSONAL_LEAVE", "LEAVE_WITHOUT_PAY", "ABSENT"] as const;
  return <section className="rounded-2xl border border-border bg-muted/30 p-4"><p className="label-caps text-muted-foreground">Leave / Absence</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{types.map((type) => { const rows = entries.filter((item) => item.entry.attendanceType === type); const minutes = rows.reduce((sum, item) => sum + (item.entry.scheduledMinutes ?? 0), 0); return <div key={type} className="flex justify-between rounded-lg bg-card px-3 py-2 text-sm"><span className="font-semibold">{label(type)}</span><span className="text-muted-foreground">{rows.length ? `${rows.length} shift${rows.length === 1 ? "" : "s"} / ${formatMinutes(minutes)}` : "0"}</span></div>; })}</div></section>;
}
function label(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
