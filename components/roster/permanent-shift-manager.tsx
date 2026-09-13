"use client";

import { useMutation } from "convex/react";
import { Pencil, Plus, Power } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Field, Modal } from "./add-roster-shift-modal";
import type { RosterEmployee, RosterPattern, ShiftType } from "./types";

const DAYS = [[1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [0, "Sun"]] as const;
type DayRow = { enabled: boolean; startTime: string; endTime: string; breakMinutes: number };

export function PermanentShiftManager({ siteId, employees, patterns, initialPatternSetKey, onClose }: {
  siteId: Id<"sites">; employees: RosterEmployee[]; patterns: RosterPattern[]; initialPatternSetKey?: string; onClose: () => void;
}) {
  const savePattern = useMutation(api.roster.savePermanentPattern);
  const setStatus = useMutation(api.roster.setPermanentPatternStatus);
  const groups = useMemo(() => groupPatterns(patterns), [patterns]);
  const initial = groups.find((group) => group.key === initialPatternSetKey);
  const [editingKey, setEditingKey] = useState<string | undefined>(initial?.key);
  const [employeeId, setEmployeeId] = useState<Id<"employees"> | "">(initial?.rows[0]?.employeeId ?? "");
  const [name, setName] = useState(initial?.rows[0]?.name ?? "Permanent Shift");
  const [shiftType, setShiftType] = useState<ShiftType>(initial?.rows[0]?.shiftType ?? "DAY");
  const [effectiveFrom, setEffectiveFrom] = useState(initial?.rows[0]?.effectiveFrom ?? localDate());
  const [effectiveTo, setEffectiveTo] = useState(initial?.rows[0]?.effectiveTo ?? "");
  const [days, setDays] = useState<Record<number, DayRow>>(() => dayState(initial?.rows));
  const [saving, setSaving] = useState(false);

  function edit(group: ReturnType<typeof groupPatterns>[number]) {
    const first = group.rows[0]; setEditingKey(group.key); setEmployeeId(first.employeeId); setName(first.name ?? "Permanent Shift");
    setShiftType(first.shiftType); setEffectiveFrom(first.effectiveFrom); setEffectiveTo(first.effectiveTo ?? ""); setDays(dayState(group.rows));
  }
  function reset() { setEditingKey(undefined); setEmployeeId(""); setName("Permanent Shift"); setShiftType("DAY"); setEffectiveFrom(localDate()); setEffectiveTo(""); setDays(dayState()); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!employeeId) return toast.error("Select an employee");
    const selectedDays = DAYS.filter(([day]) => days[day].enabled).map(([day]) => ({ dayOfWeek: day, startTime: days[day].startTime, endTime: days[day].endTime, breakMinutes: days[day].breakMinutes }));
    if (!selectedDays.length) return toast.error("Select at least one weekday");
    setSaving(true);
    try { await savePattern({ siteId, patternSetKey: editingKey, employeeId, name: name || undefined, shiftType, effectiveFrom, effectiveTo: effectiveTo || undefined, days: selectedDays }); toast.success("Permanent pattern saved"); reset(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save pattern"); }
    finally { setSaving(false); }
  }
  async function deactivate(key: string) { if (!window.confirm("Remove this recurring pattern? Future calculated shifts will stop, but dated roster history remains.")) return; try { await setStatus({ siteId, patternSetKey: key, status: "INACTIVE" }); toast.success("Permanent pattern removed"); if (editingKey === key) reset(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove pattern"); } }

  return <Modal title="Manage Permanent Shifts" onClose={onClose}><div className="space-y-6">
    <div className="space-y-2">{groups.filter((group) => group.rows.some((row) => row.status === "ACTIVE")).map((group) => { const first = group.rows[0]; const employee = employees.find((item) => item._id === first.employeeId); return <div key={group.key} className="flex items-center gap-3 rounded-xl border border-border p-3"><div className="min-w-0 flex-1"><p className="font-bold">{employee ? `${employee.firstName} ${employee.lastName}` : "Employee"}</p><p className="mt-1 text-xs text-muted-foreground">{first.name ?? "Permanent Shift"} · {first.shiftType} · {group.rows.sort((a,b) => a.dayOfWeek-b.dayOfWeek).map((row) => DAYS.find(([day]) => day === row.dayOfWeek)?.[1]).join(", ")}</p></div><Button type="button" size="icon" variant="ghost" onClick={() => edit(group)} aria-label="Edit pattern"><Pencil className="size-4" /></Button><Button type="button" size="icon" variant="ghost" onClick={() => deactivate(group.key)} aria-label="Remove pattern"><Power className="size-4" /></Button></div>; })}{groups.length === 0 && <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No permanent shifts configured.</p>}</div>
    <form onSubmit={submit} className="space-y-4 border-t border-border pt-5"><div className="flex items-center justify-between"><h3 className="font-extrabold">{editingKey ? "Edit recurring pattern" : "Add recurring pattern"}</h3>{editingKey && <Button type="button" variant="ghost" onClick={reset}><Plus className="mr-2 size-4" />New Pattern</Button>}</div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Employee"><select className="form-input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value as Id<"employees">)} required><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.firstName} {employee.lastName}</option>)}</select></Field><Field label="Pattern Name"><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Shift Type"><select className="form-input" value={shiftType} onChange={(e) => setShiftType(e.target.value as ShiftType)}><option value="DAY">Day</option><option value="NIGHT">Night</option><option value="OTHER">Other</option></select></Field><Field label="Effective From"><input className="form-input" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required /></Field><Field label="Effective To (optional)"><input className="form-input" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} /></Field></div>
      <div><p className="label-caps text-muted-foreground">Weekly Pattern</p><div className="mt-2 space-y-2">{DAYS.map(([day, label]) => <div key={day} className="grid grid-cols-[52px_1fr_1fr_76px] items-center gap-2 rounded-xl bg-muted/40 p-2"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={days[day].enabled} onChange={(e) => setDays((current) => ({ ...current, [day]: { ...current[day], enabled: e.target.checked } }))} />{label}</label><input className="form-input" type="time" disabled={!days[day].enabled} value={days[day].startTime} onChange={(e) => setDays((current) => ({ ...current, [day]: { ...current[day], startTime: e.target.value } }))} /><input className="form-input" type="time" disabled={!days[day].enabled} value={days[day].endTime} onChange={(e) => setDays((current) => ({ ...current, [day]: { ...current[day], endTime: e.target.value } }))} /><input className="form-input" type="number" min={0} disabled={!days[day].enabled} value={days[day].breakMinutes} title="Break minutes" onChange={(e) => setDays((current) => ({ ...current, [day]: { ...current[day], breakMinutes: Number(e.target.value) } }))} /></div>)}</div></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Close</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Permanent Pattern"}</Button></div>
    </form>
  </div></Modal>;
}

function groupPatterns(patterns: RosterPattern[]) { const map = new Map<string, RosterPattern[]>(); for (const pattern of patterns) map.set(pattern.patternSetKey, [...(map.get(pattern.patternSetKey) ?? []), pattern]); return [...map].map(([key, rows]) => ({ key, rows })); }
function dayState(rows: RosterPattern[] = []) { const state: Record<number, DayRow> = {}; for (const [day] of DAYS) { const row = rows.find((item) => item.dayOfWeek === day && item.status === "ACTIVE"); state[day] = { enabled: Boolean(row), startTime: row?.startTime ?? "06:00", endTime: row?.endTime ?? "14:00", breakMinutes: row?.breakMinutes ?? 30 }; } return state; }
function localDate() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
