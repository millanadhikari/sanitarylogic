import type {
  CompletionMode,
  PlannerFrequency,
  ScopeCategory,
} from "./periodicPlanner";

export const STANDARD_TENANCY_SCOPE_CATEGORIES: ScopeCategory[] = [
  "WASTE",
  "CARPETED_FLOORS",
  "HARD_FLOORS",
  "TENANCY_AREA",
  "KITCHEN",
];

export type StandardScopeScheduleDefinition = {
  key: string;
  frequency: PlannerFrequency;
  completionMode?: CompletionMode;
};

export type StandardScopeItemDefinition = {
  key: string;
  category: ScopeCategory;
  title: string;
  description?: string;
  instructions?: string;
  sortOrder: number;
  schedules: StandardScopeScheduleDefinition[];
};

const items: StandardScopeItemDefinition[] = [
  {
    key: "waste-empty-centralised-containers",
    category: "WASTE",
    title:
      "Empty all centralized non-recyclable and recyclable waste containers and return them to original location",
    sortOrder: 10,
    schedules: [
      { key: "waste-empty-centralised-containers-daily", frequency: "DAILY" },
    ],
  },
  {
    key: "waste-remove-to-disposal-point",
    category: "WASTE",
    title:
      "Remove all non-recyclable and recyclable waste to nominated disposal point",
    sortOrder: 20,
    schedules: [
      { key: "waste-remove-to-disposal-point-daily", frequency: "DAILY" },
      {
        key: "waste-remove-to-disposal-point-twice-weekly",
        frequency: "TWICE_WEEKLY",
      },
    ],
  },
  {
    key: "waste-four-bin-system",
    category: "WASTE",
    title:
      "Tenancies will be provided with a 4-waste bin system. The bins will consist of waste, paper recycle and comingle.",
    sortOrder: 30,
    schedules: [
      { key: "waste-four-bin-system-daily", frequency: "DAILY" },
    ],
  },
  {
    key: "carpeted-floors-spot-vacuum",
    category: "CARPETED_FLOORS",
    title: "Spot Vacuum clean thoroughfares and heavy use areas",
    sortOrder: 10,
    schedules: [
      { key: "carpeted-floors-spot-vacuum-daily", frequency: "DAILY" },
    ],
  },
  {
    key: "carpeted-floors-full-vacuum",
    category: "CARPETED_FLOORS",
    title:
      "Full Vacuum of tenancy by Friday - One part of the tenancy will be detailed vacuum daily and full floor will be completed by Friday",
    sortOrder: 20,
    schedules: [
      { key: "carpeted-floors-full-vacuum-weekly", frequency: "WEEKLY" },
    ],
  },
  {
    key: "carpeted-floors-spot-clean",
    category: "CARPETED_FLOORS",
    title:
      "Spot clean any marks, stains, and spillages with approved cleaning agent - Tenant to supply if they have a specific product otherwise base building product will be used.",
    sortOrder: 30,
    schedules: [
      {
        key: "carpeted-floors-spot-clean-site-determined",
        frequency: "SITE_DETERMINED",
      },
    ],
  },
  {
    key: "hard-floors-spot-vacuum-dust-mop",
    category: "HARD_FLOORS",
    title: "Spot vacuum floors/dust & mop with attention to corners and edges.",
    sortOrder: 10,
    schedules: [
      { key: "hard-floors-spot-vacuum-dust-mop-daily", frequency: "DAILY" },
    ],
  },
  {
    key: "hard-floors-spot-wash",
    category: "HARD_FLOORS",
    title: "Spot wash with damp mop to remove all marks, stains, and spills.",
    sortOrder: 20,
    schedules: [
      { key: "hard-floors-spot-wash-daily", frequency: "DAILY" },
    ],
  },
  {
    key: "hard-floors-full-clean",
    category: "HARD_FLOORS",
    title: "Full clean of hard floors (wet mop or machine scrub)",
    sortOrder: 30,
    schedules: [
      { key: "hard-floors-full-clean-weekly", frequency: "WEEKLY" },
    ],
  },
  {
    key: "hard-floors-strip-and-seal",
    category: "HARD_FLOORS",
    title: "Strip and Seal",
    sortOrder: 40,
    schedules: [
      { key: "hard-floors-strip-and-seal-daily", frequency: "DAILY" },
      {
        key: "hard-floors-strip-and-seal-site-determined",
        frequency: "SITE_DETERMINED",
      },
    ],
  },
  {
    key: "tenancy-area-office-entry-doors",
    category: "TENANCY_AREA",
    title: "Spot clean all office entry doors & frames up to 2 mtr",
    sortOrder: 10,
    schedules: [
      { key: "tenancy-area-office-entry-doors-daily", frequency: "DAILY" },
    ],
  },
  {
    key: "tenancy-area-surfaces",
    category: "TENANCY_AREA",
    title:
      "Remove dust and spillages from tables, cabinets, counters, ledges, signage and windowsills. Please note deep clean or polishing on the tables / desks will be a special clean.",
    sortOrder: 20,
    schedules: [
      { key: "tenancy-area-surfaces-daily", frequency: "DAILY" },
    ],
  },
  {
    key: "tenancy-area-walls-and-frames",
    category: "TENANCY_AREA",
    title:
      "Remove dust, stains/marks, spillages (below 2 metres), from all wall surfaces, columns, partitions, glazing, skirting, doors, door frames, and jambs (spot clean as required)",
    sortOrder: 30,
    schedules: [
      { key: "tenancy-area-walls-and-frames-weekly", frequency: "WEEKLY" },
    ],
  },
  {
    key: "tenancy-area-light-diffusers",
    category: "TENANCY_AREA",
    title: "Clean and dust light diffusers and exhaust grilles",
    sortOrder: 40,
    schedules: [
      { key: "tenancy-area-light-diffusers-monthly", frequency: "MONTHLY" },
    ],
  },
  {
    key: "tenancy-area-high-level-dusting",
    category: "TENANCY_AREA",
    title:
      "Remove dust from high level partitions, frames, ledges and sills above 2mtrs up to standard ceiling height.",
    sortOrder: 50,
    schedules: [
      {
        key: "tenancy-area-high-level-dusting-quarterly",
        frequency: "QUARTERLY",
      },
    ],
  },
  {
    key: "tenancy-area-air-conditioning-vents",
    category: "TENANCY_AREA",
    title:
      "Wipe clean all air conditioning supply air vents, return air vents and dust surrounding ceiling",
    sortOrder: 60,
    schedules: [
      {
        key: "tenancy-area-air-conditioning-vents-bi-annual",
        frequency: "BI_ANNUAL",
      },
    ],
  },
  {
    key: "tenancy-area-internal-facade-window-glass",
    category: "TENANCY_AREA",
    title: "Full Clean of Internal facade window glass",
    sortOrder: 70,
    schedules: [
      {
        key: "tenancy-area-internal-facade-window-glass-monthly",
        frequency: "MONTHLY",
      },
      {
        key: "tenancy-area-internal-facade-window-glass-annual",
        frequency: "ANNUAL",
      },
    ],
  },
  {
    key: "tenancy-area-partition-glazing",
    category: "TENANCY_AREA",
    title: "Full clean of Partition Glazing",
    sortOrder: 80,
    schedules: [
      { key: "tenancy-area-partition-glazing-daily", frequency: "DAILY" },
      { key: "tenancy-area-partition-glazing-annual", frequency: "ANNUAL" },
    ],
  },
  {
    key: "kitchen-stainless-steel-sinks",
    category: "KITCHEN",
    title:
      "Clean and wipe Stainless steel sinks surrounds, tap, drains and miscellaneous fittings e.g. Zip or Billi tap",
    sortOrder: 10,
    schedules: [
      { key: "kitchen-stainless-steel-sinks-daily", frequency: "DAILY" },
    ],
  },
  {
    key: "kitchen-sweep-vacuum-and-wash",
    category: "KITCHEN",
    title:
      "Sweep and vacuum floors and wash with clean damp mop to remove all marks stains / spills.",
    sortOrder: 20,
    schedules: [
      { key: "kitchen-sweep-vacuum-and-wash-daily", frequency: "DAILY" },
    ],
  },
  {
    key: "kitchen-mop-hard-floor",
    category: "KITCHEN",
    title: "Mop hard floor.",
    sortOrder: 30,
    schedules: [
      { key: "kitchen-mop-hard-floor-daily", frequency: "DAILY" },
    ],
  },
  {
    key: "kitchen-bench-tops",
    category: "KITCHEN",
    title: "Wipe clean bench tops.",
    sortOrder: 40,
    schedules: [
      { key: "kitchen-bench-tops-daily", frequency: "DAILY" },
      {
        key: "kitchen-bench-tops-site-determined",
        frequency: "SITE_DETERMINED",
      },
    ],
  },
  {
    key: "kitchen-cupboards-bins-and-appliances",
    category: "KITCHEN",
    title:
      "Remove dust and marks from outside faces of cupboards, bins, fridges, other appliances and walls (below 2 metres)",
    sortOrder: 50,
    schedules: [
      {
        key: "kitchen-cupboards-bins-and-appliances-weekly",
        frequency: "WEEKLY",
      },
    ],
  },
  {
    key: "kitchen-light-diffusers",
    category: "KITCHEN",
    title: "Clean and dust light diffusers and exhaust grilles",
    sortOrder: 60,
    schedules: [
      { key: "kitchen-light-diffusers-monthly", frequency: "MONTHLY" },
    ],
  },
];

export const STANDARD_TENANCY_SCOPE = {
  key: "STANDARD_TENANCY_CLEAN" as const,
  version: "1.0.0",
  name: "Standard Tenancy Clean",
  description: [
    "Standard tenancy services include 1 x Tenancy Kitchen Facility per tenancy/floor of a tenancy.",
    "Vinyl, Stone and other Hard Floors are included up to 10% of tenancy floor area.",
    "Standard service includes servicing a centralised waste bin system with no deskside bins.",
    "Cleaning above these allowances, or Tenancy Toilets, Showers or other Amenities, is Special Tenancy Cleaning and will later be priced separately.",
  ].join("\n"),
  available: true,
  items,
};
