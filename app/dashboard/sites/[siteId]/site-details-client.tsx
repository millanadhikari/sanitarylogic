"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  MapPin,
  ShieldCheck,
  Users,
  PackageSearch,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { SiteTeamPanel } from "@/components/team/site-team-panel";
import { SiteContactDirectory } from "@/components/sites/site-contact-directory";

export default function SiteDetailsClient() {
  const params = useParams<{
    siteId: string;
  }>();

  const siteId =
    params.siteId as Id<"sites">;

  const siteData = useQuery(
    api.sites.getById,
    { siteId },
  );

  const tenancies = useQuery(
    api.tenancies.getBySite,
    { siteId },
  );

  if (
    siteData === undefined ||
    tenancies === undefined
  ) {
    return <SiteDetailsLoading />;
  }

  if (!siteData) {
    return null;
  }

  const site = siteData.site;

  const activeTenancies =
    tenancies.filter(
      (tenancy) =>
        tenancy.status === "ACTIVE",
    );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      {/* Back */}
      <Link
        href="/dashboard/sites"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Sites
      </Link>

      {/* ==================================================
          SITE HEADER
      ================================================== */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="label-caps text-muted-foreground">
                Site
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-[2.5rem]">
                  {site.name}
                </h1>

                <StatusBadge
                  status={site.status}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />

                  {formatAddress(site)}
                </span>

                {site.code && (
                  <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                    {site.code}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="gap-2 rounded-xl">
                <Link href={`/dashboard/sites/${siteId}/assets`}>
                  <PackageSearch className="size-4" />
                  View Assets
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2 rounded-xl">
                <Link href={`/dashboard/sites/${siteId}/documents`}>
                  <FileText className="size-4" />
                  View Documents
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="gap-2 rounded-xl"
              >
                <Link href={`/dashboard/sites/${siteId}/periodic-planner`}>
                  <CalendarDays className="size-4" />
                  Periodic Planner
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-xl"
              >
                <Link
                  href={`/dashboard/sites/${siteId}/tenancies`}
                >
                  View Tenancies
                </Link>
              </Button>

              <Button
                asChild
                className="gap-2 rounded-xl"
              >
                <Link
                  href={`/dashboard/sites/${siteId}/tenancies`}
                >
                  <Building2 className="size-4" />
                  Manage Tenancies
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          METRICS
      ================================================== */}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tenancies"
          value={activeTenancies.length}
          description="Active at this site"
          icon={Building2}
        />

        <MetricCard
          label="Site Contacts"
          value="Managed"
          description="Contact directory available below"
          icon={Users}
        />

        <MetricCard
          label="Upcoming Events"
          value="—"
          description="Events and access notices"
          icon={CalendarDays}
        />

        <MetricCard
          label="Compliance"
          value="—"
          description="Inspections coming later"
          icon={ShieldCheck}
        />
      </section>

      <SiteTeamPanel siteId={siteId} />

      {/* ==================================================
          SITE INFORMATION / CONTACTS
      ================================================== */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        {/* Site Information */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="label-caps text-muted-foreground">
            Site Information
          </p>

          <h2 className="mt-2 text-xl font-extrabold tracking-tight">
            Property Details
          </h2>

          <div className="mt-6 space-y-6">
            <InfoRow
              label="Site Name"
              value={site.name}
            />

            <InfoRow
              label="Site Code"
              value={
                site.code ||
                "Not provided"
              }
            />

            <InfoRow
              label="Address"
              value={formatAddress(site)}
            />

            <InfoRow
              label="Suburb"
              value={
                site.suburb ||
                "Not provided"
              }
            />

            <InfoRow
              label="State"
              value={
                site.state ||
                "Not provided"
              }
            />

            <InfoRow
              label="Postcode"
              value={
                site.postcode ||
                "Not provided"
              }
            />

            <InfoRow
              label="Country"
              value={
                site.country ||
                "Australia"
              }
            />
          </div>
        </section>

        <SiteContactDirectory siteId={siteId} />
      </div>

      {/* ==================================================
          TENANCIES
      ================================================== */}

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="label-caps text-muted-foreground">
              Occupancy
            </p>

            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              Tenancies
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Businesses and occupants
              operating from this site.
            </p>
          </div>

          <Link
            href={`/dashboard/sites/${siteId}/tenancies`}
            className="label-caps text-primary hover:underline"
          >
            View All
          </Link>
        </div>

        {activeTenancies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No tenancies"
            description="No active tenancies have been added to this site."
          />
        ) : (
          <div className="divide-y divide-border">
            {activeTenancies
              .slice(0, 6)
              .map((tenancy) => (
                <Link
                  key={tenancy._id}
                  href={`/dashboard/sites/${siteId}/tenancies/${tenancy._id}`}
                  className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      {tenancy.name}
                    </p>

                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {tenancy.floor ||
                        tenancy.contactName ||
                        "No additional information"}
                    </p>
                  </div>

                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
          </div>
        )}
      </section>

      {/* ==================================================
          EVENTS + OPERATIONAL INFORMATION
      ================================================== */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Events */}
        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-5">
            <p className="label-caps text-muted-foreground">
              Schedule
            </p>

            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              Upcoming Site Events
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Building events, restricted
              access, maintenance and special
              cleaning requirements.
            </p>
          </div>

          <EmptyState
            icon={CalendarDays}
            title="No upcoming events"
            description="Future site events and operational notices will appear here."
          />
        </section>

        {/* Operational summary */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="label-caps text-muted-foreground">
            Site Operations
          </p>

          <h2 className="mt-2 text-xl font-extrabold tracking-tight">
            Operational Information
          </h2>

          <div className="mt-6 space-y-3">
            <FutureFeature
              icon={ClipboardCheck}
              title="Inspections"
              description="Cleaning inspections and audit history."
            />

            <FutureFeature
              icon={ShieldCheck}
              title="Access & Security"
              description="Keys, passes, alarm and security instructions."
            />

            <FutureFeature
              icon={CalendarDays}
              title="Operating Hours"
              description="Building access and service hours."
            />

          </div>
        </section>
      </div>
    </div>
  );
}

/* ======================================================
   METRIC
====================================================== */

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof Building2;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="label-caps text-muted-foreground">
          {label}
        </p>

        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-[18px]" />
        </span>
      </div>

      <p className="mt-4 text-[2.5rem] font-extrabold leading-none tracking-tight">
        {value}
      </p>

      <p className="mt-4 text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/* ======================================================
   INFO
====================================================== */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="label-caps text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

/* ======================================================
   FUTURE FEATURE
====================================================== */

function FutureFeature({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {title}
        </p>

        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>

      <span className="hidden rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:inline-flex">
        Planned
      </span>
    </div>
  );
}

/* ======================================================
   EMPTY
====================================================== */

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>

      <p className="mt-4 font-bold">
        {title}
      </p>

      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const active =
    status === "ACTIVE";

  return (
    <span
      className={`rounded-md px-2.5 py-1 text-xs font-bold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {active
        ? "Active"
        : "Inactive"}
    </span>
  );
}

function SiteDetailsLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      <div className="h-44 animate-pulse rounded-2xl bg-muted" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map(
          (item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-2xl bg-muted"
            />
          ),
        )}
      </div>
    </div>
  );
}

function formatAddress(site: {
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
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
    "No address provided"
  );
}
