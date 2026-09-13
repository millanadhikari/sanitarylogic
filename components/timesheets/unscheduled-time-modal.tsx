"use client";

import { useMutation } from "convex/react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Modal } from "@/components/roster/add-roster-shift-modal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { TimesheetEmployee } from "./types";

export function UnscheduledTimeModal({ siteId, referenceDate, periodStart, employees, onClose }: { siteId: Id<"sites">; referenceDate: string; periodStart: string; employees: TimesheetEmployee[]; onClose: () => void }) {
  const addTime = useMutation(api.timesheets.addUnscheduledTime);
  const [employeeId, setEmployeeId] = useState<Id<"employees"> | "">("");
  const [workDate, setWorkDate] = useState(periodStart);
  const [actualStart, setActualStart] = useState("09:00"); const [actualEnd, setActualEnd] = useState("17:00");
  const [actualBreakMinutes, setActualBreakMinutes] = useState(0); const [shiftType, setShiftType] = useState<"DAY" | "NIGHT" | "OTHER">("DAY"); const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); if (!employeeId) return toast.error("Select an employee"); setSaving(true); try { await addTime({ siteId, employeeId, referenceDate, workDate, actualStart, actualEnd, actualBreakMinutes, shiftType, notes: notes || undefined }); toast.success("Unscheduled time added"); onClose(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not add time"); } finally { setSaving(false); } }
  return <Modal title="Add Unscheduled Time" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Employee"><select className="form-input" value={employeeId} onChange={(event) => setEmployeeId(event.target.value as Id<"employees">)} required><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName}</option>)}</select></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Date"><input className="form-input" type="date" value={workDate} onChange={(event) => setWorkDate(event.target.value)} required /></Field><Field label="Actual Start"><input className="form-input" type="time" value={actualStart} onChange={(event) => setActualStart(event.target.value)} required /></Field><Field label="Actual Finish"><input className="form-input" type="time" value={actualEnd} onChange={(event) => setActualEnd(event.target.value)} required /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Break Minutes"><input className="form-input" type="number" min={0} value={actualBreakMinutes} onChange={(event) => setActualBreakMinutes(Number(event.target.value))} /></Field><Field label="Shift Type"><select className="form-input" value={shiftType} onChange={(event) => setShiftType(event.target.value as typeof shiftType)}><option value="DAY">Day</option><option value="NIGHT">Night</option><option value="OTHER">Other</option></select></Field></div><Field label="Reason / Notes"><textarea className="form-input min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} required /></Field><div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Add Time"}</Button></div></form></Modal>;
}
