"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/roster/add-roster-shift-modal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LeaveSummary } from "./leave-summary";
import { MonthlyTimesheetWeeks } from "./monthly-timesheet-weeks";
import { TimesheetEntryModal } from "./timesheet-entry-modal";
import { TimesheetEntryRows } from "./timesheet-entry-row";
import { TimesheetStatusBadge } from "./timesheet-status-badge";
import { formatMinutes, signedMinutes } from "./timesheet-summary";
import type { TimesheetDetailEntry, TimesheetEmployee } from "./types";

export function EmployeeTimesheet({ timesheetId, employees, onClose }: { timesheetId: Id<"employeeTimesheets">; employees: TimesheetEmployee[]; onClose: () => void }) {
  const detail = useQuery(api.timesheets.getDetail, { timesheetId });
  const submitTimesheet = useMutation(api.timesheets.submit); const approveTimesheet = useMutation(api.timesheets.approve); const rejectTimesheet = useMutation(api.timesheets.reject); const reopenTimesheet = useMutation(api.timesheets.reopen); const removeDraft = useMutation(api.timesheets.removeDraft);
  const [editing, setEditing] = useState<TimesheetDetailEntry | null>(null); const [working, setWorking] = useState(false);
  if (detail === undefined) return <Modal title="Employee Timesheet" onClose={onClose}><div className="flex min-h-52 items-center justify-center"><Loader2 className="size-5 animate-spin text-primary" /></div></Modal>;
  const rostered = detail.entries.reduce((sum, item) => sum + (item.entry.scheduledMinutes ?? 0), 0); const actual = detail.entries.reduce((sum, item) => sum + (item.entry.actualMinutes ?? 0), 0);
  async function run(action: () => Promise<unknown>, success: string) { setWorking(true); try { await action(); toast.success(success); } catch (error) { toast.error(error instanceof Error ? error.message : "Action failed"); } finally { setWorking(false); } }
  async function deleteDraft() { if (!window.confirm("Delete this draft timesheet and all of its entries? The roster will remain unchanged.")) return; setWorking(true); try { await removeDraft({ timesheetId }); toast.success("Draft timesheet deleted"); onClose(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete draft timesheet"); } finally { setWorking(false); } }
  return <><Modal title={detail.employeeName} onClose={onClose}><div className="space-y-5"><div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{formatPeriod(detail.timesheet.periodStart, detail.timesheet.periodEnd)}</p><p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{detail.timesheet.periodType}</p></div><TimesheetStatusBadge status={detail.timesheet.status} locked={detail.timesheet.status === "APPROVED"} /></div>{detail.timesheet.rejectionReason && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><strong>Rejected:</strong> {detail.timesheet.rejectionReason}</div>}<div className="grid gap-3 sm:grid-cols-3"><Metric label="Rostered" value={formatMinutes(rostered)} /><Metric label="Actual" value={formatMinutes(actual)} /><Metric label="Variance" value={signedMinutes(actual - rostered)} /></div><LeaveSummary entries={detail.entries} />{detail.timesheet.periodType === "MONTHLY" ? <MonthlyTimesheetWeeks entries={detail.entries} canEdit={detail.canEdit} onEdit={setEditing} /> : <div className="overflow-hidden rounded-xl border border-border"><TimesheetEntryRows entries={detail.entries} canEdit={detail.canEdit} onEdit={setEditing} /></div>}<div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">{detail.timesheet.status === "DRAFT" && detail.canEdit && <Button variant="destructive" disabled={working} className="sm:mr-auto" onClick={() => void deleteDraft()}><Trash2 className="size-4" />Delete Draft</Button>}<Button variant="outline" onClick={onClose}>Close</Button>{detail.canEdit && <Button disabled={working} onClick={() => run(() => submitTimesheet({ timesheetId }), "Timesheet submitted")}>Submit Timesheet</Button>}{detail.canApprove && <><Button variant="destructive" disabled={working} onClick={() => { const reason = window.prompt("Reason for rejection"); if (reason) void run(() => rejectTimesheet({ timesheetId, reason }), "Timesheet rejected"); }}>Reject</Button><Button disabled={working} onClick={() => run(() => approveTimesheet({ timesheetId }), "Timesheet approved")}>Approve</Button></>}{detail.canReopen && <Button disabled={working} onClick={() => { if (window.confirm("Reopen this approved timesheet for editing? This action is recorded.")) void run(() => reopenTimesheet({ timesheetId }), "Timesheet reopened"); }}>Reopen Timesheet</Button>}</div></div></Modal>{editing && <TimesheetEntryModal item={editing} employees={employees} onClose={() => setEditing(null)} />}</>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted/40 p-3"><p className="label-caps text-muted-foreground">{label}</p><p className="mt-2 text-xl font-extrabold">{value}</p></div>; }
function formatPeriod(from: string, to: string) { const f = (value: string) => new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)); return `${f(from)} – ${f(to)}`; }
