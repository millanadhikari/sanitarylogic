"use client";

import { useMutation, useQuery } from "convex/react";
import { CalendarClock, Check, ChevronLeft, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Frequency = Doc<"tenancyScopeItemSchedules">["frequency"];
type ScheduleDraft = { frequency: Frequency; recurrenceMode: "RECURRING" | "MANUAL_DATE"; completionMode: "AUTO" | "MANUAL"; startsOn?: string; endsOn?: string; weekdays?: Weekday[]; scheduledFor?: string };
type ServiceDraft = { catalogueKey?: string; title: string; description?: string; instructions?: string; schedules: ScheduleDraft[] };
type SavedScope = NonNullable<ReturnType<typeof useQuery<typeof api.specialTenancyScope.getSpecialScope>>>;

const WEEKDAYS = [[0, "Sun"], [1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"]] as const;
const FREQUENCIES: Frequency[] = ["DAILY", "TWICE_WEEKLY", "WEEKLY", "MONTHLY", "QUARTERLY", "BI_ANNUAL", "ANNUAL", "SITE_DETERMINED"];
const FREQUENCY_GROUPS: Array<{ label: string; frequencies: Frequency[] }> = [
  { label: "Daily", frequencies: ["DAILY"] },
  { label: "Weekly", frequencies: ["WEEKLY", "TWICE_WEEKLY"] },
  { label: "Monthly", frequencies: ["MONTHLY"] },
  { label: "Quarterly", frequencies: ["QUARTERLY"] },
  { label: "Bi-Annual", frequencies: ["BI_ANNUAL"] },
  { label: "Annual", frequencies: ["ANNUAL"] },
  { label: "Site Determined", frequencies: ["SITE_DETERMINED"] },
];

export function SpecialScopePanel({ siteId }: { siteId: Id<"sites"> }) {
  const setup = useQuery(api.specialTenancyScope.getSetupData, { siteId });
  const save = useMutation(api.specialTenancyScope.saveSpecialScope);
  const [tenancyId, setTenancyId] = useState("");
  const [mode, setMode] = useState<"VIEW" | "EDIT">("VIEW");
  const [step, setStep] = useState<2 | 3>(2);
  const [timeZone, setTimeZone] = useState("Australia/Sydney");
  const [drafts, setDrafts] = useState<ServiceDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const scope = useQuery(api.specialTenancyScope.getSpecialScope, tenancyId ? { tenancyId: tenancyId as Id<"tenancies"> } : "skip");

  if (!setup) return <div className="mt-6 h-48 animate-pulse rounded-2xl bg-muted" />;

  function beginConfiguration() {
    if (!tenancyId || scope === undefined) return;
    setTimeZone(scope.template?.timeZone ?? setup?.defaultTimeZone ?? "Australia/Sydney");
    setDrafts(scope.items.map(({ item, schedules }) => ({
      catalogueKey: item.sourceServiceKey,
      title: item.title,
      description: item.description,
      instructions: item.instructions,
      schedules: schedules.map(scheduleToDraft),
    })));
    setStep(2);
    setMode("EDIT");
  }

  function toggleCatalogue(service: NonNullable<typeof setup>["catalogue"][number]) {
    if (drafts.some((draft) => draft.catalogueKey === service.key)) {
      setDrafts((current) => current.filter((draft) => draft.catalogueKey !== service.key));
      return;
    }
    setDrafts((current) => [...current, {
      catalogueKey: service.key,
      title: service.title,
      description: service.description,
      schedules: service.defaultSchedules.filter((schedule) => !schedule.optional).map((schedule) => ({
        frequency: schedule.frequency,
        recurrenceMode: schedule.recurrenceMode,
        completionMode: schedule.completionMode,
        startsOn: schedule.recurrenceMode === "RECURRING" ? today : undefined,
        weekdays: schedule.weekdays ?? (schedule.configurableWeekdayCount ? WEEKDAYS.slice(1, 1 + schedule.configurableWeekdayCount).map(([day]) => day) : undefined),
      })),
    }]);
  }

  function updateService(index: number, update: Partial<ServiceDraft>) {
    setDrafts((current) => current.map((draft, draftIndex) => draftIndex === index ? { ...draft, ...update } : draft));
  }

  function updateSchedule(serviceIndex: number, scheduleIndex: number, update: Partial<ScheduleDraft>) {
    setDrafts((current) => current.map((draft, draftIndex) => draftIndex !== serviceIndex ? draft : {
      ...draft,
      schedules: draft.schedules.map((schedule, ruleIndex) => ruleIndex === scheduleIndex ? { ...schedule, ...update } : schedule),
    }));
  }

  function changeFrequency(serviceIndex: number, scheduleIndex: number, frequency: Frequency) {
    const manualDate = frequency === "SITE_DETERMINED";
    updateSchedule(serviceIndex, scheduleIndex, {
      frequency,
      recurrenceMode: manualDate ? "MANUAL_DATE" : "RECURRING",
      completionMode: defaultCompletionMode(frequency),
      startsOn: manualDate ? undefined : today,
      endsOn: undefined,
      scheduledFor: manualDate ? today : undefined,
      weekdays: frequency === "WEEKLY" ? [1] : frequency === "TWICE_WEEKLY" ? [1, 4] : undefined,
    });
  }

  function toggleWeekday(serviceIndex: number, scheduleIndex: number, day: Weekday) {
    const schedule = drafts[serviceIndex].schedules[scheduleIndex];
    const selected = schedule.weekdays ?? [];
    const limit = schedule.frequency === "TWICE_WEEKLY" ? 2 : 7;
    const weekdays = selected.includes(day) ? selected.filter((value) => value !== day) : selected.length < limit ? [...selected, day].sort() : selected;
    updateSchedule(serviceIndex, scheduleIndex, { weekdays });
  }

  async function submit() {
    if (!tenancyId || drafts.length === 0) return;
    setSaving(true);
    try {
      await save({ tenancyId: tenancyId as Id<"tenancies">, timeZone, services: drafts });
      toast.success(scope?.template ? "Special Scope updated" : "Special Scope created");
      setMode("VIEW");
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save Special Scope");
    } finally {
      setSaving(false);
    }
  }

  return <Panel>
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <Header step={mode === "EDIT" ? step : undefined} />
      {mode === "VIEW" && scope?.template && setup.canManageScope && <Button className="shrink-0 rounded-xl" onClick={beginConfiguration}><Pencil className="size-4" />Edit Scope</Button>}
    </div>
    <label className="mt-6 block max-w-xl text-sm font-bold">Tenancy<select className="form-input mt-2" value={tenancyId} disabled={mode === "EDIT"} onChange={(event) => { setTenancyId(event.target.value); setMode("VIEW"); }}><option value="">Select a tenancy</option>{setup.tenancies.map((tenancy) => <option key={tenancy._id} value={tenancy._id}>{tenancy.name}</option>)}</select></label>
    {!tenancyId ? <EmptyState title="Select a tenancy" description="Choose a tenancy to view its configured Special Scope." />
      : scope === undefined ? <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted" />
        : mode === "EDIT" ? <ScopeEditor setup={setup} step={step} timeZone={timeZone} setTimeZone={setTimeZone} drafts={drafts} setDrafts={setDrafts} toggleCatalogue={toggleCatalogue} updateService={updateService} updateSchedule={updateSchedule} changeFrequency={changeFrequency} toggleWeekday={toggleWeekday} today={today} saving={saving} setStep={setStep} onCancel={() => setMode("VIEW")} onSubmit={submit} isExisting={scope.template !== null} />
          : !scope.template ? <EmptyState title="No special tenancy scope configured" description="This tenancy currently uses the inherited Standard Scope only." action={setup.canManageScope ? <Button className="rounded-xl" onClick={beginConfiguration}><Plus className="size-4" />Set Up Special Scope</Button> : undefined} />
            : <ConfiguredScope scope={scope} />}
  </Panel>;
}

function ConfiguredScope({ scope }: { scope: SavedScope }) {
  const groups = FREQUENCY_GROUPS.map(({ label, frequencies }) => ({
    label,
    rows: scope.items.flatMap(({ item, schedules }) => schedules.filter((schedule) => frequencies.includes(schedule.frequency)).map((schedule) => ({ item, schedule }))),
  })).filter(({ rows }) => rows.length > 0);
  const today = dateInTimeZone(scope.template?.timeZone ?? "Australia/Sydney");
  return <div className="mt-6 space-y-5">
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground"><span>{scope.items.length} configured services</span><span>{scope.template?.timeZone}</span><span className="font-bold text-emerald-700">ACTIVE</span></div>
    {groups.map(({ label, rows }) => <section key={label} className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="border-b border-border bg-muted/40 px-5 py-3"><p className="label-caps text-muted-foreground">{label}</p></div>
      <div className="divide-y divide-border">{rows.map(({ item, schedule }) => {
        const nextDue = nextDueDate(schedule, today);
        const status = item.status === "ACTIVE" && schedule.status === "ACTIVE" ? "ACTIVE" : "INACTIVE";
        return <div key={schedule._id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
          <div className="min-w-0"><p className="font-bold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{schedulePattern(schedule)}</p></div>
          <Pill>{schedule.completionMode === "AUTO" ? "Automatic" : "Manual completion"}</Pill>
          <div className="flex items-center gap-2 text-sm text-muted-foreground md:min-w-40"><CalendarClock className="size-4" />{nextDue ? `Next ${displayDate(nextDue)}` : "No upcoming date"}</div>
          <span className={`text-xs font-extrabold tracking-wider ${status === "ACTIVE" ? "text-emerald-700" : "text-muted-foreground"}`}>{status}</span>
        </div>;
      })}</div>
    </section>)}
  </div>;
}

function ScopeEditor({ setup, step, timeZone, setTimeZone, drafts, setDrafts, toggleCatalogue, updateService, updateSchedule, changeFrequency, toggleWeekday, today, saving, setStep, onCancel, onSubmit, isExisting }: {
  setup: NonNullable<ReturnType<typeof useQuery<typeof api.specialTenancyScope.getSetupData>>>;
  step: 2 | 3; timeZone: string; setTimeZone: (value: string) => void; drafts: ServiceDraft[]; setDrafts: React.Dispatch<React.SetStateAction<ServiceDraft[]>>;
  toggleCatalogue: (service: (typeof setup)["catalogue"][number]) => void; updateService: (index: number, update: Partial<ServiceDraft>) => void;
  updateSchedule: (serviceIndex: number, scheduleIndex: number, update: Partial<ScheduleDraft>) => void; changeFrequency: (serviceIndex: number, scheduleIndex: number, frequency: Frequency) => void;
  toggleWeekday: (serviceIndex: number, scheduleIndex: number, day: Weekday) => void; today: string; saving: boolean; setStep: (step: 2 | 3) => void; onCancel: () => void; onSubmit: () => void; isExisting: boolean;
}) {
  if (step === 3) return <div className="mt-6 space-y-4"><div className="divide-y divide-border overflow-hidden rounded-xl border border-border">{drafts.map((draft, index) => <div key={`${draft.catalogueKey ?? "custom"}-${index}`} className="p-4"><p className="font-bold">{draft.title}</p><p className="mt-1 text-sm text-muted-foreground">{draft.schedules.map(schedulePattern).join(" · ")}</p></div>)}</div><div className="flex justify-between gap-3"><Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="size-4" />Back</Button><Button disabled={saving} onClick={onSubmit}>{saving ? "Saving…" : isExisting ? "Update Special Scope" : "Create Special Scope"}</Button></div></div>;

  const invalid = drafts.length === 0 || drafts.some((draft) => !draft.title.trim() || draft.schedules.length === 0 || draft.schedules.some((schedule) => (schedule.recurrenceMode === "RECURRING" && !schedule.startsOn) || ((schedule.frequency === "WEEKLY" || schedule.frequency === "TWICE_WEEKLY") && !schedule.weekdays?.length) || (schedule.frequency === "TWICE_WEEKLY" && schedule.weekdays?.length !== 2) || (schedule.recurrenceMode === "MANUAL_DATE" && !schedule.scheduledFor)));
  return <div className="mt-6 space-y-6">
    <label className="block max-w-xl text-sm font-bold">Scope timezone<input className="form-input mt-2" value={timeZone} onChange={(event) => setTimeZone(event.target.value)} /></label>
    <div><p className="label-caps text-muted-foreground">Service catalogue</p><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{setup.catalogue.map((service) => {
      const selected = drafts.some((draft) => draft.catalogueKey === service.key);
      return <button type="button" key={service.key} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`} onClick={() => toggleCatalogue(service)}><span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{selected && <Check className="size-3" />}</span><span><span className="font-bold">{service.title}</span><span className="mt-1 block text-xs text-muted-foreground">{service.defaultSchedules.filter((schedule) => !schedule.optional).map(schedulePattern).join(" + ")}</span></span></button>;
    })}</div></div>
    <div className="flex items-center justify-between gap-3"><p className="label-caps text-muted-foreground">Configured services</p><Button variant="outline" size="sm" onClick={() => setDrafts((current) => [...current, { title: "Custom Service", schedules: [newSchedule("WEEKLY", today)] }])}><Plus className="size-4" />Add Custom Service</Button></div>
    {drafts.length === 0 ? <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">Select at least one service from the catalogue or add a custom service.</div> : <div className="space-y-4">{drafts.map((draft, serviceIndex) => <div key={`${draft.catalogueKey ?? "custom"}-${serviceIndex}`} className="rounded-2xl border border-border p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">{draft.catalogueKey ? <p className="font-extrabold">{draft.title}</p> : <input className="form-input max-w-md" value={draft.title} onChange={(event) => updateService(serviceIndex, { title: event.target.value })} placeholder="Custom service name" />}<Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDrafts((current) => current.filter((_, index) => index !== serviceIndex))}><Trash2 className="size-4" />Remove service</Button></div>
      <div className="mt-4 space-y-3">{draft.schedules.map((schedule, scheduleIndex) => <ScheduleEditor key={scheduleIndex} schedule={schedule} onFrequency={(frequency) => changeFrequency(serviceIndex, scheduleIndex, frequency)} onUpdate={(update) => updateSchedule(serviceIndex, scheduleIndex, update)} onWeekday={(day) => toggleWeekday(serviceIndex, scheduleIndex, day)} onRemove={() => updateService(serviceIndex, { schedules: draft.schedules.filter((_, index) => index !== scheduleIndex) })} />)}<Button variant="outline" size="sm" onClick={() => updateService(serviceIndex, { schedules: [...draft.schedules, newSchedule("WEEKLY", today)] })}><Plus className="size-4" />Add schedule rule</Button></div>
    </div>)}</div>}
    <div className="flex justify-between gap-3"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button disabled={invalid} onClick={() => setStep(3)}>Review scope</Button></div>
  </div>;
}

function ScheduleEditor({ schedule, onFrequency, onUpdate, onWeekday, onRemove }: { schedule: ScheduleDraft; onFrequency: (frequency: Frequency) => void; onUpdate: (update: Partial<ScheduleDraft>) => void; onWeekday: (day: Weekday) => void; onRemove: () => void }) {
  return <div className="rounded-xl bg-muted/40 p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <EditorField label="Frequency"><select className="form-input" value={schedule.frequency} onChange={(event) => onFrequency(event.target.value as Frequency)}>{FREQUENCIES.map((frequency) => <option key={frequency} value={frequency}>{frequencyLabel(frequency)}</option>)}</select></EditorField>
    <EditorField label="Completion mode"><select className="form-input" value={schedule.completionMode} disabled={schedule.recurrenceMode === "MANUAL_DATE"} onChange={(event) => onUpdate({ completionMode: event.target.value as "AUTO" | "MANUAL" })}><option value="AUTO">Automatic</option><option value="MANUAL">Manual</option></select></EditorField>
    {schedule.recurrenceMode === "MANUAL_DATE" ? <EditorField label="Scheduled date"><input type="date" className="form-input" value={schedule.scheduledFor ?? ""} onChange={(event) => onUpdate({ scheduledFor: event.target.value })} /></EditorField> : <><EditorField label="Starts on"><input type="date" className="form-input" value={schedule.startsOn ?? ""} onChange={(event) => onUpdate({ startsOn: event.target.value })} /></EditorField><EditorField label="Ends on"><input type="date" className="form-input" value={schedule.endsOn ?? ""} onChange={(event) => onUpdate({ endsOn: event.target.value || undefined })} /></EditorField></>}
  </div>{(schedule.frequency === "WEEKLY" || schedule.frequency === "TWICE_WEEKLY") && <div className="mt-3"><p className="text-xs font-semibold text-muted-foreground">Weekdays</p><div className="mt-2 flex flex-wrap gap-2">{WEEKDAYS.map(([day, label]) => <button type="button" key={day} onClick={() => onWeekday(day)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${schedule.weekdays?.includes(day) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{label}</button>)}</div></div>}<button type="button" className="mt-3 text-xs font-semibold text-destructive" onClick={onRemove}>Remove rule</button></div>;
}

function Panel({ children }: { children: React.ReactNode }) { return <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">{children}</section>; }
function Header({ step }: { step?: 2 | 3 }) { return <div className="flex items-start gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Settings2 className="size-5" /></span><div><p className="label-caps text-muted-foreground">Special Tenancy Scope{step ? ` · Step ${step} of 3` : ""}</p><h2 className="mt-1 text-2xl font-extrabold">Tenancy-specific services</h2><p className="mt-2 text-sm text-muted-foreground">Extra services configured in addition to the inherited Standard Scope.</p></div></div>; }
function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <div className="mt-6 rounded-2xl border border-dashed border-border px-6 py-12 text-center"><p className="font-extrabold">{title}</p><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>; }
function EditorField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>; }
function Pill({ children }: { children: React.ReactNode }) { return <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{children}</span>; }

function scheduleToDraft(schedule: Doc<"tenancyScopeItemSchedules">): ScheduleDraft {
  return schedule.recurrenceMode === "MANUAL_DATE" ? { frequency: "SITE_DETERMINED", recurrenceMode: "MANUAL_DATE", completionMode: "MANUAL", scheduledFor: schedule.scheduledFor } : { frequency: schedule.frequency, recurrenceMode: "RECURRING", completionMode: schedule.completionMode, startsOn: schedule.startsOn, endsOn: schedule.endsOn, weekdays: schedule.weekdays };
}
function newSchedule(frequency: Frequency, today: string): ScheduleDraft { return frequency === "SITE_DETERMINED" ? { frequency, recurrenceMode: "MANUAL_DATE", completionMode: "MANUAL", scheduledFor: today } : { frequency, recurrenceMode: "RECURRING", completionMode: defaultCompletionMode(frequency), startsOn: today, weekdays: frequency === "WEEKLY" ? [1] : frequency === "TWICE_WEEKLY" ? [1, 4] : undefined }; }
function defaultCompletionMode(frequency: Frequency): "AUTO" | "MANUAL" { return frequency === "DAILY" || frequency === "WEEKLY" || frequency === "TWICE_WEEKLY" ? "AUTO" : "MANUAL"; }
function frequencyLabel(frequency: Frequency) { if (frequency === "TWICE_WEEKLY") return "Bi-Weekly"; if (frequency === "BI_ANNUAL") return "Bi-Annual"; if (frequency === "SITE_DETERMINED") return "Site Determined"; return frequency[0] + frequency.slice(1).toLowerCase(); }
function schedulePattern(schedule: { frequency: Frequency; weekdays?: Weekday[]; scheduledFor?: string }) { if (schedule.frequency === "SITE_DETERMINED") return schedule.scheduledFor ? `Scheduled ${displayDate(schedule.scheduledFor)}` : "Site Determined"; if (schedule.frequency === "WEEKLY" || schedule.frequency === "TWICE_WEEKLY") { const days = (schedule.weekdays ?? []).map((day) => WEEKDAYS.find(([value]) => value === day)?.[1]).filter(Boolean).join(" / "); return days ? `${frequencyLabel(schedule.frequency)} · ${days}` : frequencyLabel(schedule.frequency); } return frequencyLabel(schedule.frequency); }

function nextDueDate(schedule: Doc<"tenancyScopeItemSchedules">, today: string) {
  if (schedule.recurrenceMode === "MANUAL_DATE") return schedule.scheduledFor >= today ? schedule.scheduledFor : null;
  const start = schedule.startsOn > today ? schedule.startsOn : today;
  for (let offset = 0; offset <= 740; offset += 1) { const date = addDays(start, offset); if (schedule.endsOn && date > schedule.endsOn) return null; if (isOccurrenceDate(schedule, date)) return date; }
  return null;
}
function isOccurrenceDate(schedule: Extract<Doc<"tenancyScopeItemSchedules">, { recurrenceMode: "RECURRING" }>, date: string) {
  if (date < schedule.startsOn || (schedule.endsOn && date > schedule.endsOn)) return false;
  const current = parseDate(date); const anchor = parseDate(schedule.startsOn);
  if (schedule.frequency === "DAILY") return true;
  if (schedule.frequency === "WEEKLY" || schedule.frequency === "TWICE_WEEKLY") return (schedule.weekdays ?? []).includes(current.getUTCDay() as Weekday);
  const monthDelta = (current.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + current.getUTCMonth() - anchor.getUTCMonth();
  const interval = schedule.frequency === "MONTHLY" ? 1 : schedule.frequency === "QUARTERLY" ? 3 : schedule.frequency === "BI_ANNUAL" ? 6 : 12;
  if (monthDelta < 0 || monthDelta % interval !== 0) return false;
  const lastDay = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
  return current.getUTCDate() === Math.min(anchor.getUTCDate(), lastDay);
}
function dateInTimeZone(timeZone: string) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""; return `${get("year")}-${get("month")}-${get("day")}`; }
function addDays(value: string, amount: number) { const date = parseDate(value); date.setUTCDate(date.getUTCDate() + amount); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`; }
function parseDate(value: string) { const [year, month, day] = value.split("-").map(Number); return new Date(Date.UTC(year, month - 1, day)); }
function displayDate(value: string) { return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parseDate(value)); }
