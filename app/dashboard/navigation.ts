import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileBarChart,
  Home,
  Settings,
  ShieldAlert,
  Users,
  UserRound,
  ListChecks,
  PackageSearch,
  CalendarRange,
  Timer,
} from "lucide-react";

export type AppRole =
  | "SUPER_ADMIN"
  | "AREA_MANAGER"
  | "SITE_MANAGER"
  | "SUPERVISOR"
  | "CLEANER";

export type NavigationItem = {
  title: string;
  href: string;
  icon: typeof Home;
  roles: AppRole[];
};

export type NavigationSection = {
  title?: string;
  items: NavigationItem[];
};

export const navigation: NavigationSection[] = [
  {
    items: [
      {
        title: "Overview",
        href: "/dashboard",
        icon: Home,
        roles: [
          "SUPER_ADMIN",
          "AREA_MANAGER",
          "SITE_MANAGER",
          "SUPERVISOR",
          "CLEANER",
        ],
      },
    ],
  },

  {
    title: "Operations",
    items: [
      {
        title: "Assets",
        href: "/dashboard/sites/:siteId/assets",
        icon: PackageSearch,
        roles: ["SITE_MANAGER"],
      },
      {
        title: "Roster",
        href: "/dashboard/sites/:siteId/roster",
        icon: CalendarRange,
        roles: ["SITE_MANAGER"],
      },
      {
        title: "Timesheets",
        href: "/dashboard/sites/:siteId/timesheets",
        icon: Timer,
        roles: ["SITE_MANAGER"],
      },
      {
        title: "Sites",
        href: "/dashboard/sites",
        icon: Building2,
        roles: [
          "SUPER_ADMIN",
          "AREA_MANAGER",
        ],
      },
      {
        title: "Schedule",
        href: "/dashboard/schedule",
        icon: CalendarDays,
        roles: [
          "SUPER_ADMIN",
          "AREA_MANAGER",
          "SITE_MANAGER",
          "SUPERVISOR",
        ],
      },
      {
        title: "Tasks",
        href: "/dashboard/tasks",
        icon: ListChecks,
        roles: [
          "AREA_MANAGER",
          "SITE_MANAGER",
          "SUPERVISOR",
          "CLEANER",
        ],
      },
      {
        title: "Inspections",
        href: "/dashboard/inspections",
        icon: ClipboardCheck,
        roles: [
          "SUPER_ADMIN",
          "AREA_MANAGER",
          "SITE_MANAGER",
          "SUPERVISOR",
        ],
      },
      {
        title: "Issues",
        href: "/dashboard/issues",
        icon: ShieldAlert,
        roles: [
          "SUPER_ADMIN",
          "AREA_MANAGER",
          "SITE_MANAGER",
          "SUPERVISOR",
          "CLEANER",
        ],
      },
    ],
  },

  {
    title: "People",
    items: [
      {
        title: "Team",
        href: "/dashboard/team",
        icon: Users,
        roles: [
          "SUPER_ADMIN",
          "AREA_MANAGER",
          "SITE_MANAGER",
        ],
      },
      {
        title: "Cleaners",
        href: "/dashboard/cleaners",
        icon: UserRound,
        roles: [
          "SUPER_ADMIN",
          "AREA_MANAGER",
          "SITE_MANAGER",
          "SUPERVISOR",
        ],
      },
    ],
  },

  {
    title: "Reporting",
    items: [
      {
        title: "Reports",
        href: "/dashboard/reports",
        icon: FileBarChart,
        roles: [
          "SUPER_ADMIN",
          "AREA_MANAGER",
        ],
      },
    ],
  },

  {
    title: "Administration",
    items: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
];

export function getNavigationForRole(
  role: AppRole,
) {
  return navigation
    .map((section) => ({
      ...section,

      items: section.items.filter((item) =>
        item.roles.includes(role),
      ),
    }))
    .filter(
      (section) =>
        section.items.length > 0,
    );
}
