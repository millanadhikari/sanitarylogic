"use client";

import { useQuery } from "convex/react";
import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const PREVIEW_LIMIT = 6;

export function SiteTeamPanel({ siteId }: { siteId: Id<"sites"> }) {
  const data = useQuery(api.employees.list, { siteId, status: "ACTIVE" });

  if (data === undefined) {
    return <div className="mt-6 h-48 animate-pulse rounded-2xl bg-muted" />;
  }

  const employees = data.employees.slice(0, PREVIEW_LIMIT);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <p className="label-caps text-muted-foreground">Workforce</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight">Site Employees</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.employees.length} active {data.employees.length === 1 ? "employee" : "employees"} assigned to this site.
          </p>
        </div>

        <Link href="/dashboard/team" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
          View All in Team
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {employees.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <Users className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-3 font-bold">No active site employees</p>
          <p className="mt-1 text-sm text-muted-foreground">Assign employees to this site from the Team directory.</p>
        </div>
      ) : (
        <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
          {employees.map((employee) => (
            <Link key={employee._id} href={`/dashboard/team/employees/${employee._id}`} className="flex min-w-0 items-center gap-3 bg-card px-5 py-4 transition-colors hover:bg-muted/40">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                {initials(employee.firstName, employee.lastName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{employee.firstName} {employee.lastName}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{employee.jobTitle || formatEmploymentType(employee.employmentType)}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      {data.employees.length > PREVIEW_LIMIT && (
        <div className="border-t border-border px-6 py-3 text-center text-xs text-muted-foreground">
          Showing {PREVIEW_LIMIT} of {data.employees.length} employees. View the Team directory for the complete list.
        </div>
      )}
    </section>
  );
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
}

function formatEmploymentType(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
