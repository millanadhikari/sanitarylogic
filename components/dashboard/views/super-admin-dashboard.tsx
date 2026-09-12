"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import {
  Building2,
  Users,
  UserPlus,
  Mail,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  ChevronRight,
  FileCheck2,
  CircleAlert,
  Loader2,
} from "lucide-react";

import { api } from "@/convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function SuperAdminDashboard() {
  const context = useQuery(
    api.users.getMyContext,
  );

  const overview = useQuery(
    api.dashboard.getSuperAdminOverview,
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
      label: "Total Sites",
      value: overview.totalSites.toString(),
      icon: Building2,
      note:
        overview.totalSites === 1
          ? "1 active site"
          : `${overview.totalSites} active sites`,
    },

    {
      label: "Area Managers",
      value:
        overview.areaManagers.toString(),
      icon: Users,
      note:
        overview.areaManagers === 1
          ? "1 active Area Manager"
          : `${overview.areaManagers} active Area Managers`,
    },

    {
      label: "Active Staff",
      value:
        overview.activeStaff.toLocaleString(),
      icon: Users,
      note: "Active company users",
    },

    {
      label: "Network Compliance",
      value:
        overview.networkCompliance !== null
          ? `${overview.networkCompliance}%`
          : "—",
      icon: ShieldCheck,
      progress:
        overview.networkCompliance ??
        undefined,
      note:
        overview.networkCompliance === null
          ? "Compliance tracking coming soon"
          : undefined,
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      {/* Page Heading */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-[2.5rem]">
            Regional Operations Overview
          </h1>

          <p className="mt-1 text-muted-foreground">
            Real-time network status across{" "}
            {context.company?.name ??
              "your company"}.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            asChild
            variant="outline"
            className="h-12 gap-2 rounded-xl font-semibold"
          >
            <Link href="/dashboard/team">
              <UserPlus className="size-4" />
              Add Area Manager
            </Link>
          </Button>

          <Button
            asChild
            className="h-12 gap-2 rounded-xl font-semibold"
          >
            <Link href="/dashboard/team">
              <Mail className="size-4" />
              Send Invitations
            </Link>
          </Button>
        </div>
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

            {stat.progress !== undefined ? (
              <Progress
                value={stat.progress}
                className="mt-5 h-2"
              />
            ) : (
              <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                {stat.label ===
                  "Total Sites" &&
                  overview.totalSites > 0 && (
                    <TrendingUp className="size-4 text-primary" />
                  )}

                <span>
                  {stat.note}
                </span>
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.9fr_1fr]">
        <SitePerformanceWatchlist />

        <SystemActivity />
      </div>
    </div>
  );
}

/*
 * -------------------------------------------------------
 * Site Performance
 * -------------------------------------------------------
 */

function SitePerformanceWatchlist() {
  const sites = useQuery(
    api.sites.getMySites,
  );

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
        <h2 className="text-xl font-extrabold tracking-tight">
          Site Performance Watchlist
        </h2>

        <Link
          href="/dashboard/sites"
          className="label-caps text-primary hover:underline"
        >
          View All Sites
        </Link>
      </div>

      {sites === undefined ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : sites.length === 0 ? (
        <EmptySites />
      ) : (
        <ul>
          {sites
            .slice(0, 5)
            .map((site) => (
              <li
                key={site._id}
                className="border-b border-border last:border-0"
              >
                <Link
                  href={`/dashboard/sites/${site._id}`}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Building2 className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {site.name}
                    </p>

                    <p className="truncate text-sm text-muted-foreground">
                      {formatSiteAddress(site)}
                    </p>
                  </div>

                  <div className="hidden text-right sm:block">
                    <span
                      className={`label-caps inline-block rounded px-2 py-1 font-semibold ${
                        site.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {site.status}
                    </span>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Compliance not tracked yet
                    </p>
                  </div>

                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

/*
 * -------------------------------------------------------
 * Activity
 * -------------------------------------------------------
 */

function SystemActivity() {
  /*
   * We haven't created an activity/audit log
   * table yet.
   *
   * Keep the actual Lovable section, but show
   * an honest empty state instead of fake activity.
   */

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-xl font-extrabold tracking-tight">
          System Activity
        </h2>
      </div>

      <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <FileCheck2 className="size-5" />
        </span>

        <p className="mt-4 font-bold">
          No activity recorded yet
        </p>

        <p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">
          Company activity, invitations,
          audits and operational events will
          appear here.
        </p>
      </div>
    </section>
  );
}

/*
 * -------------------------------------------------------
 * Empty states
 * -------------------------------------------------------
 */

function EmptySites() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Building2 className="size-5" />
      </span>

      <p className="mt-4 font-bold">
        No sites yet
      </p>

      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        Add your first cleaning site to
        start managing operations.
      </p>

      <Button
        asChild
        className="mt-5 rounded-xl"
      >
        <Link href="/dashboard/sites">
          Add Site
        </Link>
      </Button>
    </div>
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