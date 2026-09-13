"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Loader2, Timer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmployeeTimesheet } from "@/components/timesheets/employee-timesheet";
import { SiteTimesheetTable } from "@/components/timesheets/site-timesheet-table";
import { TimesheetPeriodHeader } from "@/components/timesheets/timesheet-period-header";
import { TimesheetSettingsModal } from "@/components/timesheets/timesheet-settings-modal";
import { TimesheetSummary } from "@/components/timesheets/timesheet-summary";
import type { TimesheetStatus, TimesheetSummaryRow } from "@/components/timesheets/types";
import { UnscheduledTimeModal } from "@/components/timesheets/unscheduled-time-modal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function TimesheetsClient() {
  const params = useParams<{ siteId: string }>(); const siteId = params.siteId as Id<"sites">;
  const [referenceDate, setReferenceDate] = useState(localDate()); const [search, setSearch] = useState(""); const [status, setStatus] = useState<"ALL" | TimesheetStatus>("ALL");
  const [selectedId, setSelectedId] = useState<Id<"employeeTimesheets"> | null>(null); const [settingsOpen, setSettingsOpen] = useState(false); const [unscheduledOpen, setUnscheduledOpen] = useState(false); const [generating, setGenerating] = useState(false);
  const overview = useQuery(api.timesheets.getPeriodOverview, { siteId, referenceDate });
  const settings = useQuery(api.timesheetSettings.get, { siteId });
  const generate = useMutation(api.timesheets.generateDrafts);
  const visibleRows = useMemo(() => (overview?.timesheets ?? []).filter((row) => (status === "ALL" || row.status === status) && row.employeeName.toLowerCase().includes(search.trim().toLowerCase())), [overview?.timesheets, search, status]);

  if (overview === undefined || settings === undefined) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  async function generateDrafts() { setGenerating(true); try { const result = await generate({ siteId, referenceDate }); toast.success(`Draft generation complete: ${result.createdTimesheets} timesheet(s), ${result.createdEntries} entry/entries added`); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not generate timesheets"); } finally { setGenerating(false); } }
  function move(direction: -1 | 1, periodType: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY") { const date = new Date(`${referenceDate}T00:00:00`); if (periodType === "MONTHLY") date.setMonth(date.getMonth() + direction); else date.setDate(date.getDate() + direction * (periodType === "FORTNIGHTLY" ? 14 : 7)); setReferenceDate(iso(date)); }

  return <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8"><Link href={`/dashboard/sites/${siteId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Back to Site</Link><header className="mt-6 flex items-end justify-between gap-4"><div><p className="label-caps text-primary">Site Operations</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-4xl"><Timer className="size-8 text-primary" />Timesheets</h1><p className="mt-2 text-sm text-muted-foreground">{overview.siteName} · actual worked time, leave and approval</p></div>{overview.role === "SUPERVISOR" && <span className="rounded-lg bg-muted px-3 py-2 text-xs font-bold uppercase text-muted-foreground">Read only</span>}</header><div className="mt-6"><TimesheetPeriodHeader periodLabel={formatPeriod(overview.periodStart, overview.periodEnd)} cycle={title(overview.periodType)} canManage={overview.canManage} onPrevious={() => move(-1, overview.periodType)} onToday={() => setReferenceDate(localDate())} onNext={() => move(1, overview.periodType)} onGenerate={() => { if (!generating) void generateDrafts(); }} onAddTime={() => setUnscheduledOpen(true)} onSettings={() => setSettingsOpen(true)} /></div><div className="mt-4"><TimesheetSummary rows={overview.timesheets as TimesheetSummaryRow[]} /></div><div className="mt-4"><SiteTimesheetTable rows={visibleRows as TimesheetSummaryRow[]} search={search} status={status} onSearch={setSearch} onStatus={setStatus} onOpen={(row) => setSelectedId(row._id)} /></div>{selectedId && <EmployeeTimesheet timesheetId={selectedId} employees={overview.employees} onClose={() => setSelectedId(null)} />}{settingsOpen && <TimesheetSettingsModal siteId={siteId} effective={settings.effective} onClose={() => setSettingsOpen(false)} />}{unscheduledOpen && <UnscheduledTimeModal siteId={siteId} referenceDate={referenceDate} periodStart={overview.periodStart} employees={overview.employees} onClose={() => setUnscheduledOpen(false)} />}</div>;
}

function localDate() { return iso(new Date()); }
function iso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function formatPeriod(from: string, to: string) { const f = (value: string) => new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)); return `${f(from)} – ${f(to)}`; }
function title(value: string) { return value.charAt(0) + value.slice(1).toLowerCase(); }
