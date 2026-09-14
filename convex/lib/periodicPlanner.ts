import { v } from "convex/values";

export const scopeCategoryValidator = v.union(
  v.literal("WASTE"),
  v.literal("CARPETED_FLOORS"),
  v.literal("HARD_FLOORS"),
  v.literal("TENANCY_AREA"),
  v.literal("KITCHEN"),
);

export const plannerFrequencyValidator = v.union(
  v.literal("DAILY"),
  v.literal("TWICE_WEEKLY"),
  v.literal("WEEKLY"),
  v.literal("MONTHLY"),
  v.literal("QUARTERLY"),
  v.literal("BI_ANNUAL"),
  v.literal("ANNUAL"),
  v.literal("SITE_DETERMINED"),
);

export const recurringFrequencyValidator = v.union(
  v.literal("DAILY"),
  v.literal("TWICE_WEEKLY"),
  v.literal("WEEKLY"),
  v.literal("MONTHLY"),
  v.literal("QUARTERLY"),
  v.literal("BI_ANNUAL"),
  v.literal("ANNUAL"),
);

export const recurrenceModeValidator = v.union(
  v.literal("RECURRING"),
  v.literal("MANUAL_DATE"),
);

export const completionModeValidator = v.union(
  v.literal("AUTO"),
  v.literal("MANUAL"),
);

export const recordStatusValidator = v.union(
  v.literal("ACTIVE"),
  v.literal("INACTIVE"),
);

export const weekdayValidator = v.union(
  v.literal(0),
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5),
  v.literal(6),
);

export const DEFAULT_TIME_ZONE = "Australia/Sydney";
export const MAX_MONTH_OCCURRENCES = 2_000;
export const MAX_LIST_RANGE_DAYS = 92;
export const MAX_LIST_EXPANSION = 10_000;

export type ScopeCategory =
  | "WASTE"
  | "CARPETED_FLOORS"
  | "HARD_FLOORS"
  | "TENANCY_AREA"
  | "KITCHEN";
export type PlannerFrequency =
  | "DAILY"
  | "TWICE_WEEKLY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "BI_ANNUAL"
  | "ANNUAL"
  | "SITE_DETERMINED";
export type RecurrenceMode = "RECURRING" | "MANUAL_DATE";
export type CompletionMode = "AUTO" | "MANUAL";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DEFAULT_SCHEDULE_MODES: Record<
  PlannerFrequency,
  { recurrenceMode: RecurrenceMode; completionMode: CompletionMode }
> = {
  DAILY: { recurrenceMode: "RECURRING", completionMode: "AUTO" },
  TWICE_WEEKLY: { recurrenceMode: "RECURRING", completionMode: "AUTO" },
  WEEKLY: { recurrenceMode: "RECURRING", completionMode: "AUTO" },
  MONTHLY: { recurrenceMode: "RECURRING", completionMode: "MANUAL" },
  QUARTERLY: { recurrenceMode: "RECURRING", completionMode: "MANUAL" },
  BI_ANNUAL: { recurrenceMode: "RECURRING", completionMode: "MANUAL" },
  ANNUAL: { recurrenceMode: "RECURRING", completionMode: "MANUAL" },
  SITE_DETERMINED: {
    recurrenceMode: "MANUAL_DATE",
    completionMode: "MANUAL",
  },
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(value: string, label: string) {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${label} is not a valid calendar date`);
  }
}

export function assertMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    throw new Error("Month must use YYYY-MM format");
  }
  assertIsoDate(`${value}-01`, "Month");
}

export function assertTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone: value }).format(0);
  } catch {
    throw new Error("Time zone must be a valid IANA time zone");
  }
}

export function cleanOptional(value?: string) {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

export function addDays(value: string, amount: number) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDate(date);
}

export function daysBetween(fromDate: string, toDate: string) {
  return Math.floor(
    (parseDate(toDate).getTime() - parseDate(fromDate).getTime()) /
      (24 * 60 * 60 * 1_000),
  );
}

export function monthBounds(month: string) {
  assertMonth(month);
  const [year, monthNumber] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, monthNumber, 0));
  return { fromDate: `${month}-01`, toDate: formatDate(end) };
}

type ScheduleLike =
  | {
      recurrenceMode: "RECURRING";
      frequency: Exclude<PlannerFrequency, "SITE_DETERMINED">;
      startsOn: string;
      endsOn?: string;
      weekdays?: Weekday[];
      intervalWeeks?: number;
    }
  | {
      recurrenceMode: "MANUAL_DATE";
      frequency: "SITE_DETERMINED";
      scheduledFor: string;
    };

export function isOccurrenceDate(schedule: ScheduleLike, date: string) {
  assertIsoDate(date, "Occurrence date");

  if (schedule.recurrenceMode === "MANUAL_DATE") {
    return schedule.scheduledFor === date;
  }

  if (date < schedule.startsOn || (schedule.endsOn && date > schedule.endsOn)) {
    return false;
  }

  const current = parseDate(date);
  const anchor = parseDate(schedule.startsOn);

  if (schedule.frequency === "DAILY") {
    return true;
  }

  if (
    schedule.frequency === "WEEKLY" ||
    schedule.frequency === "TWICE_WEEKLY"
  ) {
    const intervalWeeks = schedule.intervalWeeks ?? 1;
    const weeksSinceStart = Math.floor(daysBetween(schedule.startsOn, date) / 7);
    return (
      weeksSinceStart % intervalWeeks === 0 &&
      (schedule.weekdays ?? []).includes(current.getUTCDay() as Weekday)
    );
  }

  const monthDelta =
    (current.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    current.getUTCMonth() -
    anchor.getUTCMonth();
  const interval =
    schedule.frequency === "MONTHLY"
      ? 1
      : schedule.frequency === "QUARTERLY"
        ? 3
        : schedule.frequency === "BI_ANNUAL"
          ? 6
          : 12;

  if (monthDelta < 0 || monthDelta % interval !== 0) {
    return false;
  }

  const lastDay = new Date(
    Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return current.getUTCDate() === Math.min(anchor.getUTCDate(), lastDay);
}

export function occurrenceDatesInRange(
  schedule: ScheduleLike,
  fromDate: string,
  toDate: string,
) {
  assertIsoDate(fromDate, "Start date");
  assertIsoDate(toDate, "End date");
  if (fromDate > toDate) {
    throw new Error("Start date cannot be after end date");
  }

  const dates: string[] = [];
  for (let date = fromDate; date <= toDate; date = addDays(date, 1)) {
    if (isOccurrenceDate(schedule, date)) {
      dates.push(date);
    }
  }
  return dates;
}

export function validateScheduleInput(input: {
  frequency: PlannerFrequency;
  recurrenceMode: RecurrenceMode;
  completionMode: CompletionMode;
  startsOn?: string;
  endsOn?: string;
  weekdays?: Weekday[];
  intervalWeeks?: number;
  scheduledFor?: string;
}, options?: { flexibleWeekly?: boolean }) {
  const defaults = DEFAULT_SCHEDULE_MODES[input.frequency];
  if (input.recurrenceMode !== defaults.recurrenceMode) {
    throw new Error(`${input.frequency} does not support that recurrence mode`);
  }
  if (
    input.frequency === "SITE_DETERMINED" &&
    input.completionMode !== "MANUAL"
  ) {
    throw new Error("Site-determined work must use manual completion");
  }

  const intervalWeeks = input.intervalWeeks ?? 1;
  if (!Number.isInteger(intervalWeeks) || intervalWeeks < 1 || intervalWeeks > 52) {
    throw new Error("Weekly repeat interval must be a whole number from 1 to 52");
  }
  if (input.intervalWeeks !== undefined && input.frequency !== "WEEKLY") {
    throw new Error("A weekly repeat interval is only supported for weekly schedules");
  }

  if (input.recurrenceMode === "MANUAL_DATE") {
    if (!input.scheduledFor) {
      throw new Error("A scheduled date is required");
    }
    assertIsoDate(input.scheduledFor, "Scheduled date");
    return;
  }

  if (!input.startsOn) {
    throw new Error("A recurrence start date is required");
  }
  assertIsoDate(input.startsOn, "Start date");
  if (input.endsOn) {
    assertIsoDate(input.endsOn, "End date");
    if (input.endsOn < input.startsOn) {
      throw new Error("End date cannot be before start date");
    }
  }

  const weekdays = input.weekdays ?? [];
  if (new Set(weekdays).size !== weekdays.length) {
    throw new Error("Weekdays must be distinct");
  }
  if (weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new Error("Weekdays must be integers from 0 (Sunday) to 6 (Saturday)");
  }
  if (
    input.frequency === "WEEKLY" &&
    (weekdays.length < 1 || (!options?.flexibleWeekly && weekdays.length !== 1))
  ) {
    throw new Error(
      options?.flexibleWeekly
        ? "Weekly schedules require at least one weekday"
        : "Weekly schedules require exactly one weekday",
    );
  }
  if (input.frequency === "TWICE_WEEKLY" && weekdays.length !== 2) {
    throw new Error("Bi-Weekly schedules require exactly two weekdays");
  }
  if (
    input.frequency !== "WEEKLY" &&
    input.frequency !== "TWICE_WEEKLY" &&
    weekdays.length > 0
  ) {
    throw new Error("Weekdays are only supported for weekly schedules");
  }
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(value: Date) {
  return `${value.getUTCFullYear().toString().padStart(4, "0")}-${(
    value.getUTCMonth() + 1
  )
    .toString()
    .padStart(2, "0")}-${value.getUTCDate().toString().padStart(2, "0")}`;
}
