"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { TimesheetDetailEntry } from "./types";
import { TimesheetEntryRows } from "./timesheet-entry-row";
import { formatMinutes } from "./timesheet-summary";

export function MonthlyTimesheetWeeks({ entries, canEdit, onEdit }: { entries: TimesheetDetailEntry[]; canEdit: boolean; onEdit: (entry: TimesheetDetailEntry) => void }) {
  const groups = groupWeeks(entries);
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.map((group) => [group.key, true])));
  return <div className="space-y-3">{groups.map((group, index) => { const actual = group.entries.reduce((sum, item) => sum + (item.entry.actualMinutes ?? 0), 0); return <section key={group.key} className="overflow-hidden rounded-xl border border-border"><button type="button" onClick={() => setOpen((current) => ({ ...current, [group.key]: !current[group.key] }))} className="flex w-full items-center gap-3 bg-muted/50 px-4 py-3 text-left">{open[group.key] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}<div className="flex-1"><p className="font-bold">Week {index + 1}</p><p className="text-xs text-muted-foreground">{formatRange(group.start, group.end)}</p></div><span className="font-bold">{formatMinutes(actual)}</span></button>{open[group.key] && <TimesheetEntryRows entries={group.entries} canEdit={canEdit} onEdit={onEdit} />}</section>; })}</div>;
}
function groupWeeks(entries: TimesheetDetailEntry[]) { const map = new Map<string, TimesheetDetailEntry[]>(); for (const item of entries) { const date = new Date(`${item.entry.workDate}T00:00:00`); const offset = (date.getDay() + 6) % 7; date.setDate(date.getDate() - offset); const key = iso(date); map.set(key, [...(map.get(key) ?? []), item]); } return [...map].sort(([a], [b]) => a.localeCompare(b)).map(([key, items]) => ({ key, start: key, end: iso(addDays(new Date(`${key}T00:00:00`), 6)), entries: items })); }
function addDays(date: Date, days: number) { const value = new Date(date); value.setDate(value.getDate() + days); return value; }
function iso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function formatRange(from: string, to: string) { const f = (value: string) => new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`)); return `${f(from)} – ${f(to)}`; }
