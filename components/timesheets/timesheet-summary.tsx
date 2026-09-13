import { CalendarClock, CircleCheck, Clock3, TriangleAlert } from "lucide-react";
import type { TimesheetSummaryRow } from "./types";

export function TimesheetSummary({ rows }: { rows: TimesheetSummaryRow[] }) {
  const rostered = rows.reduce((sum, row) => sum + row.rosteredMinutes, 0);
  const actual = rows.reduce((sum, row) => sum + row.actualMinutes, 0);
  const cards = [
    { label: "Timesheets", value: String(rows.length), icon: CalendarClock },
    { label: "Rostered", value: formatMinutes(rostered), icon: Clock3 },
    { label: "Actual", value: formatMinutes(actual), icon: CircleCheck },
    { label: "Variance", value: signedMinutes(actual - rostered), icon: TriangleAlert },
  ];
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="flex justify-between"><p className="label-caps text-muted-foreground">{label}</p><Icon className="size-4 text-primary" /></div><p className="mt-3 text-2xl font-extrabold">{value}</p></div>)}</div>;
}
export function formatMinutes(minutes: number) { const absolute = Math.abs(minutes); const hours = Math.floor(absolute / 60); const mins = absolute % 60; return `${hours}h${mins ? ` ${mins}m` : ""}`; }
export function signedMinutes(minutes: number) { return minutes === 0 ? "—" : `${minutes > 0 ? "+" : "−"}${formatMinutes(minutes)}`; }
