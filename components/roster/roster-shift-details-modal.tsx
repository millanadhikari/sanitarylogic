"use client";

import { useMutation } from "convex/react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Field, Modal } from "./add-roster-shift-modal";
import type { RosterEmployee, RosterOccurrence, ShiftType } from "./types";

export function RosterShiftDetailsModal({ shift, employees, canManage, onClose, onEditPattern, onReplace }: {
  shift: RosterOccurrence; employees: RosterEmployee[]; canManage: boolean; onClose: () => void;
  onEditPattern: (patternSetKey: string) => void; onReplace: (shift: RosterOccurrence) => void;
}) {
  const override = useMutation(api.roster.overridePermanentOccurrence);
  const updateDated = useMutation(api.roster.updateDatedShift);
  const cancelDated = useMutation(api.roster.cancelDatedShift);
  const [editing, setEditing] = useState(false);
  const [employeeId, setEmployeeId] = useState<Id<"employees">>(shift.employeeId);
  const [workDate, setWorkDate] = useState(shift.workDate);
  const [startTime, setStartTime] = useState(shift.startTime);
  const [endTime, setEndTime] = useState(shift.endTime);
  const [breakMinutes, setBreakMinutes] = useState(shift.breakMinutes);
  const [shiftType, setShiftType] = useState<ShiftType>(shift.shiftType);
  const [reason, setReason] = useState(shift.reason ?? "");
  const [notes, setNotes] = useState(shift.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      if (shift.rosterShiftId) await updateDated({ rosterShiftId: shift.rosterShiftId, employeeId, workDate, startTime, endTime, breakMinutes, shiftType, reason: reason || undefined, notes: notes || undefined });
      else if (shift.patternId) await override({ patternId: shift.patternId, workDate: shift.workDate, action: "EDIT", startTime, endTime, breakMinutes, shiftType, reason: reason || undefined, notes: notes || undefined });
      toast.success("This roster occurrence was updated"); onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update shift"); }
    finally { setSaving(false); }
  }
  async function cancel() {
    const message = shift.shiftSource === "PERMANENT" ? "Cancel this permanent shift for this date only? The recurring pattern will continue next week." : "Cancel this dated roster shift?";
    if (!window.confirm(message)) return;
    try {
      if (shift.rosterShiftId) await cancelDated({ rosterShiftId: shift.rosterShiftId });
      else if (shift.patternId) await override({ patternId: shift.patternId, workDate: shift.workDate, action: "CANCEL", reason: reason || undefined });
      toast.success("Shift cancelled"); onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not cancel shift"); }
  }

  return <Modal title="Roster Shift" onClose={onClose}><div className="space-y-5">
    <div className="rounded-xl border border-border bg-muted/40 p-4"><p className="text-lg font-extrabold">{shift.employeeName}</p><p className="mt-1 font-mono text-sm">{shift.workDate} · {shift.startTime} – {shift.endTime}{shift.overnight ? " (next day)" : ""}</p><p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{shift.shiftSource} · {shift.shiftType} · {shift.status}</p>{shift.replacesEmployeeName && <p className="mt-2 text-sm text-muted-foreground">Replacing {shift.replacesEmployeeName}</p>}</div>
    {editing ? <form onSubmit={save} className="space-y-4">{shift.rosterShiftId && <Field label="Employee"><select className="form-input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value as Id<"employees">)}>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName}</option>)}</select></Field>}<div className="grid gap-4 sm:grid-cols-3">{shift.rosterShiftId && <Field label="Date"><input className="form-input" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} /></Field>}<Field label="Start"><input className="form-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Field><Field label="End"><input className="form-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Break Minutes"><input className="form-input" type="number" min={0} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} /></Field><Field label="Shift Type"><select className="form-input" value={shiftType} onChange={(e) => setShiftType(e.target.value as ShiftType)}><option value="DAY">Day</option><option value="NIGHT">Night</option><option value="OTHER">Other</option></select></Field></div><Field label="Reason"><input className="form-input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field><Field label="Notes"><textarea className="form-input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(false)}>Back</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save This Occurrence"}</Button></div></form> : <>
      {(shift.reason || shift.notes) && <div className="text-sm"><p className="font-bold">Notes</p><p className="mt-1 text-muted-foreground">{shift.reason || shift.notes}</p></div>}
      {canManage && shift.status !== "CANCELLED" && <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">{shift.patternSetKey && <Button type="button" variant="outline" onClick={() => onEditPattern(shift.patternSetKey!)}>Edit Permanent Pattern</Button>}{shift.shiftSource === "PERMANENT" && <Button type="button" variant="outline" onClick={() => onReplace(shift)}>Replace This Shift</Button>}<Button type="button" variant="outline" onClick={() => setEditing(true)}>Edit This Occurrence</Button><Button type="button" variant="destructive" onClick={cancel}>Cancel This Shift</Button></div>}
    </>}
  </div></Modal>;
}
