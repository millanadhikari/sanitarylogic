"use client";

import Link from "next/link";

import { useQuery } from "convex/react";

import {
  Activity,
  ArrowRight,
  Building2,
  ClipboardCheck,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";

import { api } from "@/convex/_generated/api";

import { Button } from "@/components/ui/button";

export default function AreaManagerDashboard() {
  const context = useQuery(
    api.users.getMyContext,
  );

  const overview = useQuery(
    api.dashboard.getAreaManagerOverview,
  );

  if (
    context === undefined ||
    overview === undefined
  ) {
    return <DashboardLoader />;
  }

  if (!context) {
    return null;
  }

  const stats = [
    {
      label: "Assigned Sites",
      value:
        overview.stats.totalSites.toString(),
      hint:
        overview.stats.totalSites === 1
          ? "1 site under your management"
          : `${overview.stats.totalSites} sites under your management`,
      icon: Building2,
    },

    {
      label: "Team Members",
      value:
        overview.stats.teamMembers.toString(),
      hint: "Across your assigned sites",
      icon: Users,
    },

    {
      label: "Inspections",
      value:
        overview.stats.inspections !== null
          ? overview.stats.inspections
          : "—",
      hint: "Inspection tracking coming soon",
      icon: ClipboardCheck,
    },

    {
      label: "Compliance Avg",
      value:
        overview.stats.complianceAverage !==
        null
          ? `${overview.stats.complianceAverage}%`
          : "—",
      hint: "Compliance tracking coming soon",
      icon: Activity,
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-muted-foreground">
            Area Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-[2.5rem]">
            Operational Overview
          </h1>

          <p className="mt-1 text-muted-foreground">
            Monitor your assigned sites,
            teams and day-to-day operations
            across{" "}
            {context.company?.name ??
              "your company"}.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="h-11 gap-2 rounded-xl font-semibold"
        >
          <Link href="/dashboard/sites">
            View My Sites

            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="label-caps text-muted-foreground">
                {stat.label}
              </p>

              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <stat.icon className="size-[18px]" />
              </span>
            </div>

            <p className="mt-4 text-[2.75rem] font-extrabold leading-none tracking-tight">
              {stat.value}
            </p>

            <p className="mt-4 text-sm text-muted-foreground">
              {stat.hint}
            </p>
          </div>
        ))}
      </div>

      {/* Main dashboard */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <AssignedSites
          sites={overview.assignedSites}
        />

        <QuickActions />
      </div>

      {/* Activity */}
      <div className="mt-6">
        <RecentActivity />
      </div>
    </div>
  );
}

function AssignedSites({
  sites,
}: {
  sites: Array<{
    _id: string;
    name: string;
    code?: string;
    address?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    status: string;
  }>;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">
            My Sites
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Sites currently assigned to you.
          </p>
        </div>

        <Link
          href="/dashboard/sites"
          className="label-caps text-primary hover:underline"
        >
          View All
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Building2 className="size-5" />
          </span>

          <p className="mt-4 font-bold">
            No assigned sites
          </p>

          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            You haven&apos;t been assigned
            to any active sites yet.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sites.map((site) => (
            <Link
              key={site._id}
              href={`/dashboard/sites/${site._id}`}
              className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-bold">
                    {site.name}
                  </p>

                  {site.code && (
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {site.code}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />

                  <span className="truncate">
                    {formatSiteAddress(site)}
                  </span>
                </div>
              </div>

              <span
                className={`hidden rounded-md px-2.5 py-1 text-xs font-bold sm:inline-flex ${
                  site.status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {formatStatus(site.status)}
              </span>

              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function QuickActions() {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="label-caps text-muted-foreground">
        Quick Actions
      </p>

      <h2 className="mt-2 text-xl font-extrabold tracking-tight">
        Operations
      </h2>

      <div className="mt-6 space-y-3">
        <QuickAction
          href="/dashboard/sites"
          icon={Building2}
          title="Manage Sites"
          description="View your assigned sites."
        />

        <QuickAction
          href="/dashboard/team"
          icon={Users}
          title="View Team"
          description="See staff across your sites."
        />

        <QuickAction
          href="/dashboard/inspections"
          icon={ClipboardCheck}
          title="Inspections"
          description="Review inspections and results."
        />
      </div>
    </section>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Building2;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-muted-foreground">
          {description}
        </p>
      </div>

      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function RecentActivity() {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-5">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">
            Recent Activity
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Operational updates from your
            assigned sites.
          </p>
        </div>
      </div>

      <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Activity className="size-5" />
        </span>

        <p className="mt-4 font-bold">
          No recent activity
        </p>

        <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
          Site activity, inspections,
          staffing updates and operational
          events will appear here.
        </p>
      </div>
    </section>
  );
}

function DashboardLoader() {
  return (
    <div className="flex min-h-[500px] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

function formatSiteAddress(site: {
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
}) {
  return (
    [
      site.address,
      site.suburb,
      site.state,
      site.postcode,
    ]
      .filter(Boolean)
      .join(", ") || "No address added"
  );
}

function formatStatus(
  status: string,
) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}