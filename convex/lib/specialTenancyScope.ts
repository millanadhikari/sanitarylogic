import type { CompletionMode, PlannerFrequency, RecurrenceMode, Weekday } from "./periodicPlanner";

export const SPECIAL_TENANCY_SCOPE_VERSION = "1.0.0";

export type SpecialScheduleDefinition = {
  frequency: PlannerFrequency;
  recurrenceMode: RecurrenceMode;
  completionMode: CompletionMode;
  weekdays?: Weekday[];
  configurableWeekdayCount?: number;
  optional?: boolean;
};

export type SpecialServiceDefinition = {
  key: string;
  title: string;
  description?: string;
  defaultSchedules: SpecialScheduleDefinition[];
};

export const SPECIAL_TENANCY_SCOPE_CATALOGUE: SpecialServiceDefinition[] = [
  { key: "DAY_KITCHEN_CLEANER", title: "Day Kitchen Cleaner", defaultSchedules: [{ frequency: "DAILY", recurrenceMode: "RECURRING", completionMode: "AUTO" }] },
  { key: "NIGHT_DISHWASHING", title: "Night Dishwashing", defaultSchedules: [{ frequency: "DAILY", recurrenceMode: "RECURRING", completionMode: "AUTO" }] },
  { key: "QUARTERLY_FRIDGE_CLEANING", title: "Quarterly Fridge Cleaning", defaultSchedules: [{ frequency: "QUARTERLY", recurrenceMode: "RECURRING", completionMode: "MANUAL" }] },
  { key: "FISH_SCALE_TILE_SCRUBBING", title: "Fish Scale Tile Scrubbing", defaultSchedules: [{ frequency: "WEEKLY", recurrenceMode: "RECURRING", completionMode: "AUTO", configurableWeekdayCount: 3 }] },
  { key: "LIMESTONE_FLOOR_SCRUBBING", title: "Limestone Floor Scrubbing", defaultSchedules: [{ frequency: "WEEKLY", recurrenceMode: "RECURRING", completionMode: "AUTO", configurableWeekdayCount: 1 }, { frequency: "DAILY", recurrenceMode: "RECURRING", completionMode: "AUTO", optional: true }] },
  { key: "OUTDOOR_TERRACE_CLEANING", title: "Outdoor Terrace Cleaning", defaultSchedules: [{ frequency: "WEEKLY", recurrenceMode: "RECURRING", completionMode: "AUTO", weekdays: [2, 5] }] },
  { key: "KITCHEN_FLOOR_MOPPING", title: "Kitchen Floor Mopping", defaultSchedules: [{ frequency: "WEEKLY", recurrenceMode: "RECURRING", completionMode: "AUTO", configurableWeekdayCount: 2 }] },
  { key: "ADDITIONAL_TOILET_REFRESH", title: "Additional Toilet Refresh", defaultSchedules: [{ frequency: "DAILY", recurrenceMode: "RECURRING", completionMode: "AUTO" }] },
];
