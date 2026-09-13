import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimesheetStatusBadge } from "./timesheet-status-badge";
import { formatMinutes, signedMinutes } from "./timesheet-summary";
import type { TimesheetStatus, TimesheetSummaryRow } from "./types";

export function SiteTimesheetTable({ rows, search, status, onSearch, onStatus, onOpen }: {
  rows: TimesheetSummaryRow[]; search: string; status: "ALL" | TimesheetStatus;
  onSearch: (value: string) => void; onStatus: (value: "ALL" | TimesheetStatus) => void; onOpen: (row: TimesheetSummaryRow) => void;
}) {
  const statuses: Array<"ALL" | TimesheetStatus> = ["ALL", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];
  return <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between"><div className="relative max-w-md flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="form-input pl-10" placeholder="Search employee…" value={search} onChange={(event) => onSearch(event.target.value)} /></div><div className="flex flex-wrap gap-1 rounded-xl bg-muted/50 p-1">{statuses.map((item) => <button key={item} type="button" onClick={() => onStatus(item)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${status === item ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{title(item)}</button>)}</div></div>
    {rows.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground">No timesheets match this period and filter.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted/60 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Employee</th><th className="px-4 py-3">Rostered</th><th className="px-4 py-3">Actual</th><th className="px-4 py-3">Variance</th><th className="px-4 py-3">Leave</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => <tr key={row._id} className="hover:bg-muted/30"><td className="px-5 py-4 font-bold">{row.employeeName}</td><td className="px-4 py-4">{formatMinutes(row.rosteredMinutes)}</td><td className="px-4 py-4">{formatMinutes(row.actualMinutes)}</td><td className="px-4 py-4 font-semibold">{signedMinutes(row.varianceMinutes)}</td><td className="px-4 py-4">{row.leaveShifts ? `${row.leaveShifts} shift${row.leaveShifts === 1 ? "" : "s"}` : "—"}</td><td className="px-4 py-4"><TimesheetStatusBadge status={row.status} locked={row.status === "APPROVED"} /></td><td className="px-5 py-4 text-right"><Button variant="outline" size="sm" onClick={() => onOpen(row)}>View</Button></td></tr>)}</tbody></table></div>}
  </section>;
}
function title(value: string) { return value.charAt(0) + value.slice(1).toLowerCase(); }
