"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  ListChecks,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { SpecialScopePanel } from "./special-scope-panel";

type ScopeCategory = Doc<"siteScopeItems">["category"];
type PlannerFrequency = Doc<"siteScopeItemSchedules">["frequency"];
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type PlannerView = "YEAR" | "MONTH" | "LIST";
type WorkspaceView = "PLANNER" | "SCOPE" | "SPECIAL";
type Occurrence = {
  scopeType: "STANDARD" | "SPECIAL";
  occurrenceKey: string;
  occurrenceDate: string;
  tenancyId: Id<"tenancies">;
  tenancyName: string;
  scopeItemId: Id<"siteScopeItems"> | Id<"tenancyScopeItems">;
  scopeItemTitle: string;
  scheduleId: Id<"siteScopeItemSchedules"> | Id<"tenancyScopeItemSchedules">;
  category: ScopeCategory | "SPECIAL";
  frequency: PlannerFrequency;
  recurrenceMode: "RECURRING" | "MANUAL_DATE";
  completionMode: "AUTO" | "MANUAL";
  isComplete: boolean;
  isAssumedComplete: boolean;
  isOverdue: boolean;
  completion: Doc<"plannerCompletions"> | null;
};

const CATEGORIES: ScopeCategory[] = [
  "WASTE",
  "CARPETED_FLOORS",
  "HARD_FLOORS",
  "TENANCY_AREA",
  "KITCHEN",
];

const FREQUENCIES: PlannerFrequency[] = [
  "DAILY",
  "TWICE_WEEKLY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "BI_ANNUAL",
  "ANNUAL",
  "SITE_DETERMINED",
];

const DEFAULT_COMPLETION: Record<PlannerFrequency, "AUTO" | "MANUAL"> = {
  DAILY: "AUTO",
  TWICE_WEEKLY: "AUTO",
  WEEKLY: "AUTO",
  MONTHLY: "MANUAL",
  QUARTERLY: "MANUAL",
  BI_ANNUAL: "MANUAL",
  ANNUAL: "MANUAL",
  SITE_DETERMINED: "MANUAL",
};

const WEEKDAYS = [
  [0, "Sunday"],
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
] as const;

export default function PeriodicPlannerClient() {
  const params = useParams<{ siteId: string }>();
  const searchParams = useSearchParams();
  const siteId = params.siteId as Id<"sites">;

  const siteData = useQuery(api.sites.getById, { siteId });
  const setupState = useQuery(api.siteScope.getSetupState, { siteId });
  const scope = useQuery(api.siteScope.getStandardScope, { siteId });
  const tenancies = useQuery(api.tenancies.getBySite, { siteId });
  const initializeScope = useMutation(api.siteScope.initializeStandardScope);

  const now = useMemo(() => new Date(), []);
  const initialToday = useMemo(() => formatIsoDate(now), [now]);
  const initialMonth = initialToday.slice(0, 7);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("PLANNER");
  const [plannerView, setPlannerView] = useState<PlannerView>("YEAR");
  const [year, setYear] = useState(Number(initialToday.slice(0, 4)));
  const [month, setMonth] = useState(initialMonth);
  const [fromDate, setFromDate] = useState(`${initialMonth}-01`);
  const [toDate, setToDate] = useState(monthEnd(initialMonth));
  const [tenancyId, setTenancyId] = useState(searchParams.get("tenancyId") ?? "");
  const [category, setCategory] = useState<ScopeCategory | "">("");
  const [frequency, setFrequency] = useState<PlannerFrequency | "">("");
  const [scopeType, setScopeType] = useState<"STANDARD" | "SPECIAL" | "">("");
  const [offset, setOffset] = useState(0);
  const [selectedOccurrence, setSelectedOccurrence] =
    useState<Occurrence | null>(null);
  const [setupTimeZone, setSetupTimeZone] = useState("Australia/Sydney");
  const [setupStartDate, setSetupStartDate] = useState(initialToday);
  const [weeklyWeekday, setWeeklyWeekday] = useState<Weekday>(1);
  const [twiceWeekdayOne, setTwiceWeekdayOne] = useState<Weekday>(1);
  const [twiceWeekdayTwo, setTwiceWeekdayTwo] = useState<Weekday>(4);
  const [isSaving, setIsSaving] = useState(false);

  const today = useMemo(
    () =>
      formatDateInTimeZone(
        now,
        setupState?.template?.timeZone ??
          setupState?.defaultTimeZone ??
          "Australia/Sydney",
      ),
    [now, setupState?.defaultTimeZone, setupState?.template?.timeZone],
  );

  const configured = setupState?.isConfigured === true;
  const plannerEnabled = configured && workspaceView === "PLANNER";
  const filters = {
    ...(tenancyId ? { tenancyId: tenancyId as Id<"tenancies"> } : {}),
    ...(category ? { category } : {}),
    ...(frequency ? { frequency } : {}),
    ...(scopeType ? { scopeType } : {}),
  };

  const yearSummary = useQuery(
    api.periodicPlanner.getYearSummary,
    plannerEnabled && plannerView === "YEAR"
      ? { siteId, year, today, ...filters }
      : "skip",
  );
  const monthData = useQuery(
    api.periodicPlanner.getMonthView,
    plannerEnabled && plannerView === "MONTH"
      ? { siteId, month, today, ...filters }
      : "skip",
  );
  const listData = useQuery(
    api.periodicPlanner.getListView,
    plannerEnabled && plannerView === "LIST"
      ? {
          siteId,
          fromDate,
          toDate,
          today,
          offset,
          limit: 100,
          ...filters,
        }
      : "skip",
  );
  const history = useQuery(
    api.periodicPlanner.getCompletionHistory,
    configured
      ? {
          siteId,
          ...(tenancyId ? { tenancyId: tenancyId as Id<"tenancies"> } : {}),
          limit: 25,
        }
      : "skip",
  );

  const activeTenancies = useMemo(
    () => tenancies?.filter((tenancy) => tenancy.status === "ACTIVE") ?? [],
    [tenancies],
  );

  if (
    siteData === undefined ||
    setupState === undefined ||
    scope === undefined ||
    tenancies === undefined
  ) {
    return <PlannerLoading />;
  }

  if (!siteData) return null;

  async function handleSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await initializeScope({
        siteId,
        timeZone: setupTimeZone,
        startsOn: setupStartDate,
        weeklyWeekday,
        twiceWeeklyWeekdays: [twiceWeekdayOne, twiceWeekdayTwo],
      });
      toast.success("Standard Scope created");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const role = setupState.role;
  const canComplete =
    role === "SUPER_ADMIN" ||
    role === "AREA_MANAGER" ||
    role === "SITE_MANAGER" ||
    role === "SUPERVISOR";

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8">
      <Link
        href={`/dashboard/sites/${siteId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to {siteData.site.name}
      </Link>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="label-caps text-muted-foreground">Site operations</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-[2.5rem]">
              Periodic Planner
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              One Standard Tenancy Scope for {siteData.site.name}, inherited by
              every active tenancy. Recurring work is calculated without storing
              future task records.
            </p>
          </div>
          {setupState.template && (
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-bold">{setupState.template.name}</p>
              <p className="mt-1 text-muted-foreground">
                {setupState.template.timeZone}
              </p>
            </div>
          )}
        </div>

        {configured && (
          <div className="flex gap-1 overflow-x-auto border-t border-border px-4 sm:px-6">
            <TopTab
              active={workspaceView === "PLANNER"}
              onClick={() => setWorkspaceView("PLANNER")}
            >
              Planner
            </TopTab>
            <TopTab
              active={workspaceView === "SCOPE"}
              onClick={() => setWorkspaceView("SCOPE")}
            >
              Standard Scope
            </TopTab>
            <TopTab active={workspaceView === "SPECIAL"} onClick={() => setWorkspaceView("SPECIAL")}>
              Special Tenancy Scope
            </TopTab>
          </div>
        )}
      </section>

      {!configured ? (
        <SetupPanel
          canManage={setupState.canManageScope}
          catalogueAvailable={setupState.catalogueAvailable}
          catalogueVersion={setupState.catalogueVersion}
          timeZone={setupTimeZone}
          setTimeZone={setSetupTimeZone}
          startsOn={setupStartDate}
          setStartsOn={setSetupStartDate}
          weeklyWeekday={weeklyWeekday}
          setWeeklyWeekday={setWeeklyWeekday}
          twiceWeekdayOne={twiceWeekdayOne}
          setTwiceWeekdayOne={setTwiceWeekdayOne}
          twiceWeekdayTwo={twiceWeekdayTwo}
          setTwiceWeekdayTwo={setTwiceWeekdayTwo}
          isSaving={isSaving}
          onSubmit={handleSetup}
        />
      ) : workspaceView === "SCOPE" ? (
        <StandardScopeEditor scope={scope} />
      ) : workspaceView === "SPECIAL" ? (
        <SpecialScopePanel siteId={siteId} />
      ) : (
        <>
          <PlannerControls
            view={plannerView}
            setView={setPlannerView}
            tenancies={activeTenancies}
            tenancyId={tenancyId}
            setTenancyId={(value) => {
              setTenancyId(value);
              setOffset(0);
            }}
            category={category}
            setCategory={(value) => {
              setCategory(value);
              setOffset(0);
            }}
            frequency={frequency}
            setFrequency={(value) => {
              setFrequency(value);
              setOffset(0);
            }}
            scopeType={scopeType}
            setScopeType={(value) => { setScopeType(value); setOffset(0); }}
          />

          {plannerView === "YEAR" && (
            <YearView
              year={year}
              setYear={setYear}
              data={yearSummary?.months}
            />
          )}
          {plannerView === "MONTH" && (
            <MonthView
              month={month}
              setMonth={setMonth}
              occurrences={monthData?.occurrences as Occurrence[] | undefined}
              truncated={monthData?.truncated ?? false}
              onSelect={setSelectedOccurrence}
            />
          )}
          {plannerView === "LIST" && (
            <ListView
              fromDate={fromDate}
              toDate={toDate}
              setFromDate={(value) => {
                setFromDate(value);
                setOffset(0);
              }}
              setToDate={(value) => {
                setToDate(value);
                setOffset(0);
              }}
              data={listData}
              offset={offset}
              setOffset={setOffset}
              onSelect={setSelectedOccurrence}
            />
          )}

          <CompletionHistory
            history={history}
            canComplete={canComplete}
          />
        </>
      )}

      {selectedOccurrence && (
        <CompletionModal
          occurrence={selectedOccurrence}
          canComplete={canComplete}
          onClose={() => setSelectedOccurrence(null)}
        />
      )}
    </div>
  );
}

function SetupPanel({
  canManage,
  catalogueAvailable,
  catalogueVersion,
  timeZone,
  setTimeZone,
  startsOn,
  setStartsOn,
  weeklyWeekday,
  setWeeklyWeekday,
  twiceWeekdayOne,
  setTwiceWeekdayOne,
  twiceWeekdayTwo,
  setTwiceWeekdayTwo,
  isSaving,
  onSubmit,
}: {
  canManage: boolean;
  catalogueAvailable: boolean;
  catalogueVersion: string;
  timeZone: string;
  setTimeZone: (value: string) => void;
  startsOn: string;
  setStartsOn: (value: string) => void;
  weeklyWeekday: Weekday;
  setWeeklyWeekday: (value: Weekday) => void;
  twiceWeekdayOne: Weekday;
  setTwiceWeekdayOne: (value: Weekday) => void;
  twiceWeekdayTwo: Weekday;
  setTwiceWeekdayTwo: (value: Weekday) => void;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Settings2 className="size-5" />
        </span>
        <div>
          <p className="label-caps text-muted-foreground">First-time setup</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
            Create the Site Standard Scope
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            This copies the versioned Standard Tenancy Clean catalogue into an
            editable Site-owned scope. Tenancies inherit it at query time.
          </p>
        </div>
      </div>

      {!catalogueAvailable && (
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          The contract task catalogue is not available in the repository. Setup
          is disabled to prevent an empty or invented Standard Scope. Expected
          catalogue version: {catalogueVersion}.
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Site scope timezone">
          <input
            className="form-input"
            value={timeZone}
            onChange={(event) => setTimeZone(event.target.value)}
            required
          />
        </Field>
        <Field label="Recurrence starts">
          <input
            type="date"
            className="form-input"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
            required
          />
        </Field>
        <Field label="Weekly day">
          <WeekdaySelect value={weeklyWeekday} onChange={setWeeklyWeekday} />
        </Field>
        <Field label="Bi-Weekly days">
          <div className="grid grid-cols-2 gap-2">
            <WeekdaySelect value={twiceWeekdayOne} onChange={setTwiceWeekdayOne} />
            <WeekdaySelect value={twiceWeekdayTwo} onChange={setTwiceWeekdayTwo} />
          </div>
        </Field>
        <div className="sm:col-span-2 xl:col-span-4">
          <Button
            type="submit"
            className="rounded-xl"
            disabled={!canManage || !catalogueAvailable || isSaving}
          >
            {isSaving ? "Creating scope…" : "Create Standard Scope"}
          </Button>
          {!canManage && (
            <p className="mt-2 text-xs text-muted-foreground">
              Your role can view the planner but cannot perform first-time setup.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

function PlannerControls({
  view,
  setView,
  tenancies,
  tenancyId,
  setTenancyId,
  category,
  setCategory,
  frequency,
  setFrequency,
  scopeType,
  setScopeType,
}: {
  view: PlannerView;
  setView: (view: PlannerView) => void;
  tenancies: Doc<"tenancies">[];
  tenancyId: string;
  setTenancyId: (value: string) => void;
  category: ScopeCategory | "";
  setCategory: (value: ScopeCategory | "") => void;
  frequency: PlannerFrequency | "";
  setFrequency: (value: PlannerFrequency | "") => void;
  scopeType: "STANDARD" | "SPECIAL" | "";
  setScopeType: (value: "STANDARD" | "SPECIAL" | "") => void;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <ViewButton active={view === "YEAR"} onClick={() => setView("YEAR")} icon={CalendarCheck}>
            Year
          </ViewButton>
          <ViewButton active={view === "MONTH"} onClick={() => setView("MONTH")} icon={CalendarDays}>
            Month
          </ViewButton>
          <ViewButton active={view === "LIST"} onClick={() => setView("LIST")} icon={ListChecks}>
            List
          </ViewButton>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect value={scopeType} onChange={(value) => setScopeType(value as "STANDARD" | "SPECIAL" | "")} label="Scope">
            <option value="">All scope</option><option value="STANDARD">Standard</option><option value="SPECIAL">Special</option>
          </FilterSelect>
          <FilterSelect value={tenancyId} onChange={setTenancyId} label="Tenancy">
            <option value="">All tenancies</option>
            {tenancies.map((tenancy) => (
              <option key={tenancy._id} value={tenancy._id}>{tenancy.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={category} onChange={(value) => setCategory(value as ScopeCategory | "")} label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}
          </FilterSelect>
          <FilterSelect value={frequency} onChange={(value) => setFrequency(value as PlannerFrequency | "")} label="Frequency">
            <option value="">All frequencies</option>
            {FREQUENCIES.map((item) => <option key={item} value={item}>{frequencyLabel(item)}</option>)}
          </FilterSelect>
        </div>
      </div>
    </section>
  );
}

function YearView({
  year,
  setYear,
  data,
}: {
  year: number;
  setYear: (year: number) => void;
  data?: Array<{
    month: string;
    scheduledCount: number;
    autoCount: number;
    manualCount: number;
    completedCount: number;
    pendingCount: number;
  }>;
}) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps text-muted-foreground">Annual overview</p>
          <h2 className="mt-1 text-2xl font-extrabold">{year}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setYear(year - 1)}><ChevronLeft /></Button>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setYear(year + 1)}><ChevronRight /></Button>
        </div>
      </div>
      {!data ? <PanelLoading /> : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((summary) => (
            <div key={summary.month} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="label-caps text-muted-foreground">{monthLabel(summary.month)}</p>
              <p className="mt-3 text-3xl font-extrabold">{summary.scheduledCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">scheduled occurrences</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Stat label="Automatic" value={summary.autoCount} />
                <Stat label="Manual" value={summary.manualCount} />
                <Stat label="Completed" value={summary.completedCount} tone="green" />
                <Stat label="Pending" value={summary.pendingCount} tone={summary.pendingCount ? "amber" : undefined} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MonthView({
  month,
  setMonth,
  occurrences,
  truncated,
  onSelect,
}: {
  month: string;
  setMonth: (month: string) => void;
  occurrences?: Occurrence[];
  truncated: boolean;
  onSelect: (occurrence: Occurrence) => void;
}) {
  const days = useMemo(() => calendarDays(month), [month]);
  const grouped = useMemo(() => {
    const result = new Map<string, Occurrence[]>();
    for (const occurrence of occurrences ?? []) {
      const current = result.get(occurrence.occurrenceDate) ?? [];
      current.push(occurrence);
      result.set(occurrence.occurrenceDate, current);
    }
    return result;
  }, [occurrences]);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label-caps text-muted-foreground">Month calendar</p>
          <h2 className="mt-1 text-xl font-extrabold">{monthLabel(month)}</h2>
        </div>
        <input type="month" className="form-input w-auto" value={month} onChange={(event) => setMonth(event.target.value)} />
      </div>
      {truncated && <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">This dense month was capped. Narrow the filters to see every occurrence.</p>}
      {!occurrences ? <PanelLoading /> : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 border-b border-border bg-muted/40">
              {WEEKDAYS.map(([, label]) => <div key={label} className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">{label.slice(0, 3)}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => (
                <div key={`${day ?? "empty"}-${index}`} className="min-h-36 border-b border-r border-border p-2">
                  {day && (
                    <>
                      <p className="text-xs font-bold text-muted-foreground">{Number(day.slice(-2))}</p>
                      <div className="mt-2 space-y-1">
                        {(grouped.get(day) ?? []).slice(0, 4).map((occurrence) => (
                          <button key={occurrence.occurrenceKey} onClick={() => onSelect(occurrence)} className={`block w-full truncate rounded-md px-2 py-1 text-left text-[11px] font-semibold ${occurrence.isComplete ? "bg-emerald-50 text-emerald-800" : occurrence.isOverdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
                            [{occurrence.scopeType}] {occurrence.tenancyName} · {occurrence.scopeItemTitle}
                          </button>
                        ))}
                        {(grouped.get(day)?.length ?? 0) > 4 && <p className="px-1 text-[10px] text-muted-foreground">+{(grouped.get(day)?.length ?? 0) - 4} more</p>}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ListView({
  fromDate,
  toDate,
  setFromDate,
  setToDate,
  data,
  offset,
  setOffset,
  onSelect,
}: {
  fromDate: string;
  toDate: string;
  setFromDate: (value: string) => void;
  setToDate: (value: string) => void;
  data: { items: Occurrence[]; total: number; hasMore: boolean; truncated: boolean } | undefined;
  offset: number;
  setOffset: (value: number) => void;
  onSelect: (occurrence: Occurrence) => void;
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="label-caps text-muted-foreground">Bounded list</p><h2 className="mt-1 text-xl font-extrabold">Scheduled work</h2></div>
        <div className="flex flex-wrap gap-3">
          <Field label="From"><input type="date" className="form-input" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></Field>
          <Field label="To"><input type="date" className="form-input" value={toDate} onChange={(event) => setToDate(event.target.value)} /></Field>
        </div>
      </div>
      {data?.truncated && <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">The result was capped. Use a shorter range or narrower filters.</p>}
      {!data ? <PanelLoading /> : data.items.length === 0 ? <EmptyPanel title="No scheduled work" description="No occurrences match this date range and filter combination." /> : (
        <div className="divide-y divide-border">
          {data.items.map((occurrence) => (
            <button key={occurrence.occurrenceKey} onClick={() => onSelect(occurrence)} className="flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-center">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${occurrence.isComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{occurrence.isComplete ? <Check className="size-4" /> : <Clock3 className="size-4" />}</span>
              <div className="min-w-0 flex-1"><p className="font-bold">{occurrence.scopeItemTitle} <ScopeBadge type={occurrence.scopeType} /></p><p className="mt-1 text-sm text-muted-foreground">{occurrence.tenancyName} · {categoryLabel(occurrence.category)}</p></div>
              <div className="sm:text-right"><p className="text-sm font-semibold">{formatDisplayDate(occurrence.occurrenceDate)}</p><p className="mt-1 text-xs text-muted-foreground">{frequencyLabel(occurrence.frequency)} · {occurrence.isAssumedComplete ? "Assumed complete" : occurrence.isComplete ? "Completed" : occurrence.isOverdue ? "Overdue" : "Pending"}</p></div>
            </button>
          ))}
        </div>
      )}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <p className="text-sm text-muted-foreground">{offset + 1}–{Math.min(offset + 100, data.total)} of {data.total}</p>
          <div className="flex gap-2"><Button variant="outline" size="sm" className="rounded-xl" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 100))}>Previous</Button><Button variant="outline" size="sm" className="rounded-xl" disabled={!data.hasMore} onClick={() => setOffset(offset + 100)}>Next</Button></div>
        </div>
      )}
    </section>
  );
}

function StandardScopeEditor({
  scope,
}: {
  scope: {
    canManageScope: boolean;
    template: Doc<"siteScopeTemplates"> | null;
    categories: Array<{ category: ScopeCategory; items: Array<{ item: Doc<"siteScopeItems">; schedules: Doc<"siteScopeItemSchedules">[] }> }>;
  };
}) {
  const updateTemplate = useMutation(api.siteScope.updateTemplate);
  const setItemStatus = useMutation(api.siteScope.setScopeItemStatus);
  const setScheduleStatus = useMutation(api.siteScope.setScheduleStatus);
  const [editingItem, setEditingItem] = useState<Doc<"siteScopeItems"> | "NEW" | null>(null);
  const [newCategory, setNewCategory] = useState<ScopeCategory>("WASTE");
  const [editingSchedule, setEditingSchedule] = useState<{ itemId: Id<"siteScopeItems">; schedule: Doc<"siteScopeItemSchedules"> | null } | null>(null);
  const [templateName, setTemplateName] = useState(scope.template?.name ?? "");
  const [templateDescription, setTemplateDescription] = useState(scope.template?.description ?? "");
  const [timeZone, setTimeZone] = useState(scope.template?.timeZone ?? "Australia/Sydney");
  const [savingTemplate, setSavingTemplate] = useState(false);

  if (!scope.template) return null;

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scope.template) return;
    setSavingTemplate(true);
    try {
      await updateTemplate({ templateId: scope.template._id, name: templateName, description: templateDescription || undefined, timeZone });
      toast.success("Standard Scope settings saved");
    } catch (error) { toast.error(errorMessage(error)); } finally { setSavingTemplate(false); }
  }

  async function archiveItem(id: Id<"siteScopeItems">) {
    if (!window.confirm("Archive this scope item and hide it from future planner views?")) return;
    try { await setItemStatus({ scopeItemId: id, status: "INACTIVE" }); toast.success("Scope item archived"); } catch (error) { toast.error(errorMessage(error)); }
  }

  async function archiveSchedule(id: Id<"siteScopeItemSchedules">) {
    if (!window.confirm("Archive this schedule rule?")) return;
    try { await setScheduleStatus({ scheduleId: id, status: "INACTIVE" }); toast.success("Schedule archived"); } catch (error) { toast.error(errorMessage(error)); }
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="label-caps text-muted-foreground">Template settings</p>
        <form onSubmit={saveTemplate} className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.5fr_1fr_auto] lg:items-end">
          <Field label="Name"><input className="form-input" value={templateName} onChange={(event) => setTemplateName(event.target.value)} disabled={!scope.canManageScope} /></Field>
          <Field label="Description"><input className="form-input" value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} disabled={!scope.canManageScope} /></Field>
          <Field label="IANA timezone"><input className="form-input" value={timeZone} onChange={(event) => setTimeZone(event.target.value)} disabled={!scope.canManageScope} /></Field>
          {scope.canManageScope && <Button type="submit" className="rounded-xl" disabled={savingTemplate}>{savingTemplate ? "Saving…" : "Save"}</Button>}
        </form>
      </section>

      {scope.categories.map((group) => (
        <section key={group.category} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
            <div><p className="label-caps text-muted-foreground">Standard category</p><h2 className="mt-1 text-xl font-extrabold">{categoryLabel(group.category)}</h2></div>
            {scope.canManageScope && <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => { setNewCategory(group.category); setEditingItem("NEW"); }}><Plus className="size-4" />Add item</Button>}
          </div>
          {group.items.length === 0 ? <EmptyPanel title="No active scope items" description="This category currently has no active items." /> : (
            <div className="divide-y divide-border">
              {group.items.map(({ item, schedules }) => (
                <div key={item._id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div><h3 className="font-bold">{item.title}</h3>{item.description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{item.description}</p>}</div>
                    {scope.canManageScope && <div className="flex gap-2"><Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => setEditingItem(item)}><Pencil className="size-3.5" />Edit</Button><Button variant="outline" size="sm" className="rounded-xl text-destructive" onClick={() => archiveItem(item._id)}><Trash2 className="size-3.5" /></Button></div>}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {schedules.map((schedule) => (
                      <button key={schedule._id} disabled={!scope.canManageScope} onClick={() => setEditingSchedule({ itemId: item._id, schedule })} className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-xs transition-colors enabled:hover:border-primary/40">
                        <span className="font-bold">{frequencyLabel(schedule.frequency)}</span><span className="ml-2 text-muted-foreground">{schedule.completionMode === "AUTO" ? "Automatic" : "Manual completion"}</span>
                      </button>
                    ))}
                    {scope.canManageScope && <button onClick={() => setEditingSchedule({ itemId: item._id, schedule: null })} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold text-primary"><Plus className="size-3.5" />Schedule</button>}
                  </div>
                  {scope.canManageScope && schedules.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{schedules.map((schedule) => <button key={schedule._id} className="text-[10px] font-semibold text-muted-foreground hover:text-destructive" onClick={() => archiveSchedule(schedule._id)}>Archive {frequencyLabel(schedule.frequency)}</button>)}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {editingItem && <ScopeItemModal templateId={scope.template._id} item={editingItem === "NEW" ? null : editingItem} initialCategory={editingItem === "NEW" ? newCategory : editingItem.category} onClose={() => setEditingItem(null)} />}
      {editingSchedule && <ScheduleModal itemId={editingSchedule.itemId} schedule={editingSchedule.schedule} onClose={() => setEditingSchedule(null)} />}
    </div>
  );
}

function ScopeItemModal({ templateId, item, initialCategory, onClose }: { templateId: Id<"siteScopeTemplates">; item: Doc<"siteScopeItems"> | null; initialCategory: ScopeCategory; onClose: () => void }) {
  const createItem = useMutation(api.siteScope.createScopeItem);
  const updateItem = useMutation(api.siteScope.updateScopeItem);
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [instructions, setInstructions] = useState(item?.instructions ?? "");
  const [category, setCategory] = useState<ScopeCategory>(initialCategory);
  const [sortOrder, setSortOrder] = useState(item?.sortOrder ?? 100);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try {
      const fields = { category, title, description: description || undefined, instructions: instructions || undefined, sortOrder };
      if (item) await updateItem({ scopeItemId: item._id, ...fields }); else await createItem({ templateId, ...fields });
      toast.success(item ? "Scope item updated" : "Scope item added"); onClose();
    } catch (error) { toast.error(errorMessage(error)); } finally { setSaving(false); }
  }

  return <Modal title={item ? "Edit scope item" : "Add scope item"} onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Category"><select className="form-input" value={category} onChange={(event) => setCategory(event.target.value as ScopeCategory)}>{CATEGORIES.map((value) => <option key={value} value={value}>{categoryLabel(value)}</option>)}</select></Field><Field label="Title"><input className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} required /></Field><Field label="Description"><textarea className="form-input min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} /></Field><Field label="Instructions"><textarea className="form-input min-h-20" value={instructions} onChange={(event) => setInstructions(event.target.value)} /></Field><Field label="Sort order"><input type="number" className="form-input" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} /></Field><ModalActions onClose={onClose} saving={saving} label={item ? "Save item" : "Add item"} /></form></Modal>;
}

function ScheduleModal({ itemId, schedule, onClose }: { itemId: Id<"siteScopeItems">; schedule: Doc<"siteScopeItemSchedules"> | null; onClose: () => void }) {
  const createSchedule = useMutation(api.siteScope.createSchedule);
  const updateSchedule = useMutation(api.siteScope.updateSchedule);
  const initialFrequency = schedule?.frequency ?? "MONTHLY";
  const [frequency, setFrequency] = useState<PlannerFrequency>(initialFrequency);
  const [completionMode, setCompletionMode] = useState<"AUTO" | "MANUAL">(schedule?.completionMode ?? DEFAULT_COMPLETION[initialFrequency]);
  const [startsOn, setStartsOn] = useState(schedule?.recurrenceMode === "RECURRING" ? schedule.startsOn : formatIsoDate(new Date()));
  const [endsOn, setEndsOn] = useState(schedule?.recurrenceMode === "RECURRING" ? schedule.endsOn ?? "" : "");
  const existingWeekdays = schedule?.recurrenceMode === "RECURRING" ? schedule.weekdays ?? [] : [];
  const [weekdayOne, setWeekdayOne] = useState(existingWeekdays[0] ?? 1);
  const [weekdayTwo, setWeekdayTwo] = useState(existingWeekdays[1] ?? 4);
  const [scheduledFor, setScheduledFor] = useState(schedule?.recurrenceMode === "MANUAL_DATE" ? schedule.scheduledFor : formatIsoDate(new Date()));
  const [saving, setSaving] = useState(false);

  function changeFrequency(value: PlannerFrequency) { setFrequency(value); setCompletionMode(DEFAULT_COMPLETION[value]); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const isManualDate = frequency === "SITE_DETERMINED";
    const weekdays = frequency === "WEEKLY" ? [weekdayOne] : frequency === "TWICE_WEEKLY" ? [weekdayOne, weekdayTwo] : undefined;
    const fields = { frequency, recurrenceMode: isManualDate ? "MANUAL_DATE" as const : "RECURRING" as const, completionMode: isManualDate ? "MANUAL" as const : completionMode, startsOn: isManualDate ? undefined : startsOn, endsOn: !isManualDate && endsOn ? endsOn : undefined, weekdays, scheduledFor: isManualDate ? scheduledFor : undefined };
    try { if (schedule) await updateSchedule({ scheduleId: schedule._id, ...fields }); else await createSchedule({ scopeItemId: itemId, ...fields }); toast.success(schedule ? "Schedule updated" : "Schedule added"); onClose(); } catch (error) { toast.error(errorMessage(error)); } finally { setSaving(false); }
  }

  return <Modal title={schedule ? "Edit schedule rule" : "Add schedule rule"} onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Frequency"><select className="form-input" value={frequency} onChange={(event) => changeFrequency(event.target.value as PlannerFrequency)}>{FREQUENCIES.map((value) => <option key={value} value={value}>{frequencyLabel(value)}</option>)}</select></Field>{frequency === "SITE_DETERMINED" ? <Field label="Scheduled date"><input type="date" className="form-input" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} required /></Field> : <><div className="grid gap-4 sm:grid-cols-2"><Field label="Starts on"><input type="date" className="form-input" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required /></Field><Field label="Ends on (optional)"><input type="date" className="form-input" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} /></Field></div>{(frequency === "WEEKLY" || frequency === "TWICE_WEEKLY") && <div className="grid gap-4 sm:grid-cols-2"><Field label="First weekday"><WeekdaySelect value={weekdayOne} onChange={setWeekdayOne} /></Field>{frequency === "TWICE_WEEKLY" && <Field label="Second weekday"><WeekdaySelect value={weekdayTwo} onChange={setWeekdayTwo} /></Field>}</div>}<Field label="Completion behaviour"><select className="form-input" value={completionMode} onChange={(event) => setCompletionMode(event.target.value as "AUTO" | "MANUAL")}><option value="AUTO">Automatic / assumed</option><option value="MANUAL">Manual completion</option></select></Field></>}<ModalActions onClose={onClose} saving={saving} label={schedule ? "Save schedule" : "Add schedule"} /></form></Modal>;
}

function CompletionModal({ occurrence, canComplete, onClose }: { occurrence: Occurrence; canComplete: boolean; onClose: () => void }) {
  const complete = useMutation(api.periodicPlanner.completeOccurrence);
  const completeSpecial = useMutation(api.periodicPlanner.completeSpecialOccurrence);
  const voidCompletion = useMutation(api.periodicPlanner.voidCompletion);
  const [notes, setNotes] = useState(occurrence.completion?.notes ?? "");
  const [saving, setSaving] = useState(false);
  async function markComplete() { setSaving(true); try { const common = { tenancyId: occurrence.tenancyId, occurrenceDate: occurrence.occurrenceDate, notes: notes || undefined }; if (occurrence.scopeType === "SPECIAL") await completeSpecial({ ...common, scheduleId: occurrence.scheduleId as Id<"tenancyScopeItemSchedules"> }); else await complete({ ...common, scheduleId: occurrence.scheduleId as Id<"siteScopeItemSchedules"> }); toast.success("Occurrence completed"); onClose(); } catch (error) { toast.error(errorMessage(error)); } finally { setSaving(false); } }
  async function undo() { if (!occurrence.completion) return; setSaving(true); try { await voidCompletion({ completionId: occurrence.completion._id }); toast.success("Completion returned to pending"); onClose(); } catch (error) { toast.error(errorMessage(error)); } finally { setSaving(false); } }
  return <Modal title="Periodic task" onClose={onClose}><div className="space-y-4"><div className="rounded-xl bg-muted/50 p-4"><p className="font-bold">{occurrence.scopeItemTitle} <ScopeBadge type={occurrence.scopeType} /></p><p className="mt-1 text-sm text-muted-foreground">{occurrence.tenancyName} · {formatDisplayDate(occurrence.occurrenceDate)}</p><p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{frequencyLabel(occurrence.frequency)} · {occurrence.completionMode === "AUTO" ? "Assumed complete" : occurrence.isComplete ? "Completed" : "Manual completion"}</p></div>{occurrence.completionMode === "MANUAL" && canComplete && !occurrence.isComplete && <Field label="Completion notes (optional)"><textarea className="form-input min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>}<div className="flex justify-end gap-2"><Button variant="outline" className="rounded-xl" onClick={onClose}>Close</Button>{occurrence.completionMode === "MANUAL" && canComplete && occurrence.isComplete && occurrence.completion && <Button variant="outline" className="rounded-xl text-destructive" disabled={saving} onClick={undo}>Void completion</Button>}{occurrence.completionMode === "MANUAL" && canComplete && !occurrence.isComplete && <Button className="rounded-xl" disabled={saving} onClick={markComplete}>{saving ? "Saving…" : "Mark complete"}</Button>}</div></div></Modal>;
}

function CompletionHistory({ history, canComplete }: { history: { items: Array<{ completion: Doc<"plannerCompletions">; scopeType: "STANDARD" | "SPECIAL"; tenancyName: string; scopeItemTitle: string; completedByName: string | null }> } | undefined; canComplete: boolean }) {
  const voidCompletion = useMutation(api.periodicPlanner.voidCompletion);
  async function voidItem(id: Id<"plannerCompletions">) { if (!window.confirm("Void this completion and return the occurrence to pending?")) return; try { await voidCompletion({ completionId: id }); toast.success("Completion voided"); } catch (error) { toast.error(errorMessage(error)); } }
  return <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="flex items-center gap-3 border-b border-border px-5 py-4"><History className="size-5 text-primary" /><div><p className="label-caps text-muted-foreground">History</p><h2 className="mt-0.5 font-extrabold">Recent completions</h2></div></div>{!history ? <PanelLoading /> : history.items.length === 0 ? <EmptyPanel title="No completion history" description="Manual completions will appear here." /> : <div className="divide-y divide-border">{history.items.map(({ completion, scopeType, tenancyName, scopeItemTitle, completedByName }) => <div key={completion._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"><span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${completion.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}><Check className="size-4" /></span><div className="min-w-0 flex-1"><p className="font-bold">{scopeItemTitle} <ScopeBadge type={scopeType} /></p><p className="mt-1 text-sm text-muted-foreground">{tenancyName} · {formatDisplayDate(completion.occurrenceDate)} · {completedByName ?? "System"}</p></div><span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{completion.status}</span>{canComplete && completion.status === "COMPLETED" && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => voidItem(completion._id)}>Void</Button>}</div>)}</div>}</section>;
}

function ScopeBadge({ type }: { type: "STANDARD" | "SPECIAL" }) { return <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 align-middle text-[9px] font-extrabold tracking-wider ${type === "SPECIAL" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800"}`}>{type}</span>; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background shadow-xl"><div className="flex items-center justify-between border-b border-border px-6 py-5"><h2 className="text-xl font-extrabold">{title}</h2><button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="size-5" /></button></div><div className="p-6">{children}</div></div></div>; }
function ModalActions({ onClose, saving, label }: { onClose: () => void; saving: boolean; label: string }) { return <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>Cancel</Button><Button type="submit" className="rounded-xl" disabled={saving}>{saving ? "Saving…" : label}</Button></div>; }
function TopTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`border-b-2 px-4 py-3 text-sm font-bold transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{children}</button>; }
function ViewButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof CalendarDays; children: React.ReactNode }) { return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}><Icon className="size-4" />{children}</button>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="label-caps mb-2 block text-muted-foreground">{label}</span>{children}</label>; }
function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <Field label={label}><select className="form-input min-w-44" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></Field>; }
function WeekdaySelect({ value, onChange }: { value: Weekday; onChange: (value: Weekday) => void }) { return <select className="form-input" value={value} onChange={(event) => onChange(Number(event.target.value) as Weekday)}>{WEEKDAYS.map(([number, label]) => <option key={number} value={number}>{label}</option>)}</select>; }
function Stat({ label, value, tone }: { label: string; value: number; tone?: "green" | "amber" }) { return <div className={`rounded-lg p-2 ${tone === "green" ? "bg-emerald-50 text-emerald-800" : tone === "amber" ? "bg-amber-50 text-amber-800" : "bg-muted/60"}`}><p className="font-bold">{value}</p><p className="mt-0.5 text-[10px] uppercase tracking-wider opacity-75">{label}</p></div>; }
function EmptyPanel({ title, description }: { title: string; description: string }) { return <div className="px-6 py-12 text-center"><p className="font-bold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>; }
function PanelLoading() { return <div className="m-5 h-40 animate-pulse rounded-xl bg-muted" />; }
function PlannerLoading() { return <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8"><div className="h-48 animate-pulse rounded-2xl bg-muted" /><div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" /></div>; }

function categoryLabel(value: ScopeCategory | "SPECIAL") { return value.split("_").map((part) => part[0] + part.slice(1).toLowerCase()).join(" "); }
function frequencyLabel(value: PlannerFrequency) { if (value === "TWICE_WEEKLY") return "Bi-Weekly"; if (value === "BI_ANNUAL") return "Bi-Annual"; return categoryLabel(value as ScopeCategory); }
function formatIsoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function formatDateInTimeZone(date: Date, timeZone: string) { const parts = new Intl.DateTimeFormat("en-AU", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${value.year}-${value.month}-${value.day}`; }
function monthEnd(month: string) { const [year, monthNumber] = month.split("-").map(Number); return formatIsoDate(new Date(year, monthNumber, 0)); }
function monthLabel(month: string) { const [year, monthNumber] = month.split("-").map(Number); return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1)); }
function formatDisplayDate(value: string) { const [year, month, day] = value.split("-").map(Number); return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(year, month - 1, day)); }
function calendarDays(month: string) { const [year, monthNumber] = month.split("-").map(Number); const count = new Date(year, monthNumber, 0).getDate(); const padding = new Date(year, monthNumber - 1, 1).getDay(); return [...Array<string | null>(padding).fill(null), ...Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`)]; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Something went wrong"; }
