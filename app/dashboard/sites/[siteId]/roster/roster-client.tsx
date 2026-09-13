"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowLeft, CalendarRange, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AddRosterShiftModal } from "@/components/roster/add-roster-shift-modal";
import { PermanentShiftManager } from "@/components/roster/permanent-shift-manager";
import type { RosterFilter } from "@/components/roster/roster-filters";
import { RosterShiftDetailsModal } from "@/components/roster/roster-shift-details-modal";
import { RosterSummary } from "@/components/roster/roster-summary";
import { RosterToolbar } from "@/components/roster/roster-toolbar";
import type { RosterOccurrence, RosterPattern } from "@/components/roster/types";
import { RosterWeekView } from "@/components/roster/roster-week-view";

export default function RosterClient() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId as Id<"sites">;
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [filter, setFilter] = useState<RosterFilter>("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerPatternKey, setManagerPatternKey] = useState<string>();
  const [selected, setSelected] = useState<RosterOccurrence | null>(null);
  const [replacement, setReplacement] = useState<RosterOccurrence | null>(null);
  const week = useQuery(api.roster.getWeek, { siteId, weekStartDate: weekStart });
  const setup = useQuery(api.roster.getSetupData, { siteId });
  const filtered = useMemo(() => (week?.occurrences ?? []).filter((shift) => filter === "ALL" || shift.shiftType === filter), [filter, week?.occurrences]);

  if (week === undefined || setup === undefined) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;

  const permanentOccurrences = week.occurrences.filter((shift) => shift.shiftSource === "PERMANENT" && shift.status === "SCHEDULED");
  function changeWeek(days: number) { setWeekStart(addDays(weekStart, days)); }
  function openPattern(key?: string) { setSelected(null); setManagerPatternKey(key); setManagerOpen(true); }
  function openReplacement(shift: RosterOccurrence) { setSelected(null); setReplacement(shift); setAddOpen(true); }

  return <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
    <Link href={`/dashboard/sites/${siteId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to Site</Link>
    <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="label-caps text-primary">Site Operations</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-4xl"><CalendarRange className="size-8 text-primary" />Roster</h1><p className="mt-2 text-sm text-muted-foreground">{week.siteName} · recurring staffing and dated coverage</p></div>{week.role === "SUPERVISOR" && <span className="rounded-lg bg-muted px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Read only</span>}</header>
    <div className="mt-6"><RosterToolbar rangeLabel={formatRange(week.weekStartDate, week.weekEndDate)} filter={filter} canManage={week.canManage} onFilterChange={setFilter} onPrevious={() => changeWeek(-7)} onToday={() => setWeekStart(mondayOf(new Date()))} onNext={() => changeWeek(7)} onAddShift={() => { setReplacement(null); setAddOpen(true); }} onManagePatterns={() => openPattern()} /></div>
    <div className="mt-4"><RosterSummary summary={week.summary} /></div>
    <div className="mt-4"><RosterWeekView weekStart={weekStart} occurrences={filtered as RosterOccurrence[]} onSelect={setSelected} /></div>
    {addOpen && <AddRosterShiftModal siteId={siteId} employees={setup.employees} permanentOccurrences={permanentOccurrences as RosterOccurrence[]} initialReplacement={replacement} onClose={() => { setAddOpen(false); setReplacement(null); }} />}
    {managerOpen && <PermanentShiftManager siteId={siteId} employees={setup.employees} patterns={setup.patterns as RosterPattern[]} initialPatternSetKey={managerPatternKey} onClose={() => { setManagerOpen(false); setManagerPatternKey(undefined); }} />}
    {selected && <RosterShiftDetailsModal shift={selected} employees={setup.employees} canManage={week.canManage} onClose={() => setSelected(null)} onEditPattern={openPattern} onReplace={openReplacement} />}
  </div>;
}

function mondayOf(date: Date) { const value = new Date(date); const day = value.getDay(); value.setDate(value.getDate() - ((day + 6) % 7)); return iso(value); }
function addDays(date: string, amount: number) { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + amount); return iso(value); }
function iso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function formatRange(from: string, to: string) { const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }; return `${new Intl.DateTimeFormat("en-AU", options).format(new Date(`${from}T00:00:00`))} – ${new Intl.DateTimeFormat("en-AU", options).format(new Date(`${to}T00:00:00`))}`; }
