"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import {
  AlertCircle,
  ArrowRight,
  Building2,
  ClipboardCheck,
  Layers3,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function SiteManagerDashboard() {
  const context = useQuery(
    api.users.getMyContext,
  );

  const overview = useQuery(
    api.dashboard.getSiteManagerOverview,
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

  if (!overview.site) {
    return <NoSiteAssigned />;
  }

  const site = overview.site;

  const stats = [
    {
      label: "Team Members",
      value:
        overview.stats.teamMembers.toString(),
      hint: "Assigned to this site",
      icon: Users,
    },

    {
      label: "Tenancies",
      value:
        overview.stats.tenancies.toString(),
      hint: "Active tenancies",
      icon: Building2,
    },

    {
      label: "Inspections Due",
      value:
        overview.stats.inspectionsDue !== null
          ? overview.stats.inspectionsDue
          : "—",
      hint: "Inspection tracking coming soon",
      icon: ClipboardCheck,
    },

    {
      label: "Open Issues",
      value:
        overview.stats.openIssues !== null
          ? overview.stats.openIssues
          : "—",
      hint: "Issue tracking coming soon",
      icon: AlertCircle,
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-muted-foreground">
            Site Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-[2.5rem]">
            {site.name}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />

              {formatSiteAddress(site)}
            </span>

            <span
              className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                site.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {formatStatus(site.status)}
            </span>
          </div>
        </div>

        <Button
          asChild
          variant="outline"
          className="h-11 gap-2 rounded-xl font-semibold"
        >
          <Link
            href={`/dashboard/sites/${site._id}`}
          >
            View Site

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

      {/* Main content */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TeamSection
          siteId={site._id}
          members={overview.teamPreview}
          total={
            overview.stats.teamMembers
          }
        />

        <TenanciesSection
          siteId={site._id}
          tenancies={
            overview.tenanciesPreview
          }
          total={
            overview.stats.tenancies
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <TodayOperations />

        <QuickActions
          siteId={site._id}
        />
      </div>
    </div>
  );
}

function TeamSection({
  members,
  total,
}: {
  siteId: string;

  members: Array<{
    userId: string;
    firstName?: string;
    lastName?: string;
    email?: string;

    role:
      | "AREA_MANAGER"
      | "SITE_MANAGER"
      | "SUPERVISOR"
      | "CLEANER";
  }>;

  total: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">
            Site Team
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {total}{" "}
            {total === 1
              ? "person"
              : "people"}{" "}
            assigned to this site.
          </p>
        </div>

        <Link
          href="/dashboard/team"
          className="label-caps text-primary hover:underline"
        >
          View Team
        </Link>
      </div>

      {members.length === 0 ? (
        <EmptySection
          icon={Users}
          title="No team members"
          description="No operational staff are currently assigned to this site."
        />
      ) : (
        <div className="divide-y divide-border">
          {members.map((member) => {
            const name =
              [
                member.firstName,
                member.lastName,
              ]
                .filter(Boolean)
                .join(" ") ||
              member.email ||
              "Unnamed User";

            return (
              <div
                key={member.userId}
                className="flex items-center gap-3 px-6 py-4"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {getInitials(
                    member.firstName,
                    member.lastName,
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {name}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatRole(
                      member.role,
                    )}
                  </p>
                </div>

                <RoleBadge
                  role={member.role}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TenanciesSection({
  siteId,
  tenancies,
  total,
}: {
  siteId: string;

  tenancies: Array<{
    _id: string;
    name: string;
    floor?: string;
    contactName?: string;
  }>;

  total: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">
            Tenancies
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {total} active{" "}
            {total === 1
              ? "tenancy"
              : "tenancies"}{" "}
            at this site.
          </p>
        </div>

        <Link
          href={`/dashboard/sites/${siteId}`}
          className="label-caps text-primary hover:underline"
        >
          View Site
        </Link>
      </div>

      {tenancies.length === 0 ? (
        <EmptySection
          icon={Building2}
          title="No tenancies"
          description="No active tenancies have been added to this site yet."
        />
      ) : (
        <div className="divide-y divide-border">
          {tenancies.map(
            (tenancy) => (
              <Link
                key={tenancy._id}
                href={`/dashboard/sites/${siteId}/tenancies/${tenancy._id}`}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Building2 className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {tenancy.name}
                  </p>

                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {tenancy.floor
                      ? `Floor: ${tenancy.floor}`
                      : tenancy.contactName
                        ? `Contact: ${tenancy.contactName}`
                        : "No additional details"}
                  </p>
                </div>

                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ),
          )}
        </div>
      )}
    </section>
  );
}

function TodayOperations() {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-xl font-extrabold tracking-tight">
          Today&apos;s Operations
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Tasks, inspections and site
          issues requiring attention.
        </p>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-3">
        <OperationCard
          icon={ClipboardCheck}
          label="Inspections"
          value="—"
          description="No inspection data yet"
        />

        <OperationCard
          icon={AlertCircle}
          label="Open Issues"
          value="—"
          description="Issue tracking coming soon"
        />

        <OperationCard
          icon={Layers3}
          label="Tasks"
          value="—"
          description="Task scheduling coming soon"
        />
      </div>
    </section>
  );
}


function OperationCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>

      <p className="label-caps mt-4 text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-2xl font-extrabold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function QuickActions({
  siteId,
}: {
  siteId: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="label-caps text-muted-foreground">
        Quick Actions
      </p>

      <h2 className="mt-2 text-xl font-extrabold tracking-tight">
        Site Operations
      </h2>

      <div className="mt-6 space-y-3">
        <QuickAction
          href={`/dashboard/sites/${siteId}`}
          icon={Building2}
          title="Site Details"
          description="Manage tenancies and site information."
        />

        <QuickAction
          href="/dashboard/team"
          icon={Users}
          title="Site Team"
          description="View staff assigned to your site."
        />

        <QuickAction
          href="/dashboard/inspections"
          icon={ClipboardCheck}
          title="Inspections"
          description="Review site inspections."
        />

        <QuickAction
          href="/dashboard/issues"
          icon={AlertCircle}
          title="Issues"
          description="Review operational issues."
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

function RoleBadge({
  role,
}: {
  role: string;
}) {
  return (
    <span className="hidden rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary sm:inline-flex">
      {formatRole(role)}
    </span>
  );
}

function EmptySection({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>

      <p className="mt-4 font-bold">
        {title}
      </p>

      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function NoSiteAssigned() {
  return (
    <div className="flex min-h-[600px] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Building2 className="size-5" />
        </span>

        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
          No Site Assigned
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your Site Manager account is
          active, but no site has been
          assigned to you. Contact your
          administrator.
        </p>
      </div>
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

function getInitials(
  firstName?: string,
  lastName?: string,
) {
  return (
    `${
      firstName?.charAt(0) ?? ""
    }${
      lastName?.charAt(0) ?? ""
    }`.toUpperCase() || "?"
  );
}

function formatRole(
  role: string,
) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
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
      .join(", ") ||
    "No address added"
  );
}