"use client";

import { useMutation } from "convex/react";
import { X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { RosterEmployee, RosterOccurrence, ShiftType } from "./types";

export function AddRosterShiftModal({ siteId, employees, permanentOccurrences, initialReplacement, onClose }: {
  siteId: Id<"sites">; employees: RosterEmployee[]; permanentOccurrences: RosterOccurrence[];
  initialReplacement?: RosterOccurrence | null; onClose: () => void;
}) {
  const createShift = useMutation(api.roster.createDatedShift);
  const [saving, setSaving] = useState(false);
  const [employeeId, setEmployeeId] = useState<Id<"employees"> | "">("");
  const [workDate, setWorkDate] = useState(initialReplacement?.workDate ?? localDate());
  const [startTime, setStartTime] = useState(initialReplacement?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initialReplacement?.endTime ?? "17:00");
  const [breakMinutes, setBreakMinutes] = useState(initialReplacement?.breakMinutes ?? 0);
  const [shiftType, setShiftType] = useState<ShiftType>(initialReplacement?.shiftType ?? "DAY");
  const [shiftSource, setShiftSource] = useState<"CASUAL" | "ADDITIONAL" | "REPLACEMENT">(initialReplacement ? "REPLACEMENT" : "CASUAL");
  const [replacementKey, setReplacementKey] = useState(initialReplacement?.occurrenceKey ?? "");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  function selectReplacement(key: string) {
    setReplacementKey(key);
    const selected = permanentOccurrences.find((item) => item.occurrenceKey === key);
    if (!selected) return;
    setWorkDate(selected.workDate); setStartTime(selected.startTime); setEndTime(selected.endTime);
    setBreakMinutes(selected.breakMinutes); setShiftType(selected.shiftType);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!employeeId) return toast.error("Select an employee");
    const replacement = permanentOccurrences.find((item) => item.occurrenceKey === replacementKey);
    if (shiftSource === "REPLACEMENT" && !replacement?.patternId) return toast.error("Select the permanent shift being replaced");
    setSaving(true);
    try {
      await createShift({ siteId, employeeId, workDate, startTime, endTime, breakMinutes, shiftType, shiftSource,
        relatedPatternId: shiftSource === "REPLACEMENT" ? replacement?.patternId : undefined,
        replacesEmployeeId: shiftSource === "REPLACEMENT" ? replacement?.employeeId : undefined,
        reason: reason || undefined, notes: notes || undefined });
      toast.success("Roster shift saved"); onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save shift"); }
    finally { setSaving(false); }
  }

  return <Modal title={initialReplacement ? "Add Replacement Shift" : "Add Roster Shift"} onClose={onClose}>
    <form onSubmit={submit} className="space-y-4">
      <Field label="Employee"><select className="form-input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value as Id<"employees">)} required><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName}</option>)}</select></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Shift Source"><select className="form-input" value={shiftSource} onChange={(e) => setShiftSource(e.target.value as typeof shiftSource)}><option value="CASUAL">Casual</option><option value="ADDITIONAL">Additional</option><option value="REPLACEMENT">Replacement</option></select></Field>
        <Field label="Shift Type"><select className="form-input" value={shiftType} onChange={(e) => setShiftType(e.target.value as ShiftType)}><option value="DAY">Day</option><option value="NIGHT">Night</option><option value="OTHER">Other</option></select></Field>
      </div>
      {shiftSource === "REPLACEMENT" && <Field label="Permanent Shift Being Replaced"><select className="form-input" value={replacementKey} onChange={(e) => selectReplacement(e.target.value)} required><option value="">Select permanent occurrence</option>{permanentOccurrences.map((shift) => <option key={shift.occurrenceKey} value={shift.occurrenceKey}>{shift.workDate} · {shift.employeeName} · {shift.startTime}-{shift.endTime}</option>)}</select></Field>}
      <div className="grid gap-4 sm:grid-cols-3"><Field label="Date"><input className="form-input" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} required /></Field><Field label="Start"><input className="form-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></Field><Field label="End"><input className="form-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required /></Field></div>
      <Field label="Break Minutes"><input className="form-input" type="number" min={0} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} /></Field>
      <Field label="Reason (optional)"><input className="form-input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Field label="Notes (optional)"><textarea className="form-input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Shift"}</Button></div>
    </form>
  </Modal>;
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4"><h2 className="text-xl font-extrabold">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Close"><X className="size-4" /></button></div><div className="p-6">{children}</div></div></div>;
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="label-caps text-muted-foreground">{label}</span><span className="mt-2 block">{children}</span></label>; }
function localDate() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
