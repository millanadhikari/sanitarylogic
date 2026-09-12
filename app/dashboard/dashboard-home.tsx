"use client";

import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import SuperAdminDashboard from "@/components/dashboard/views/super-admin-dashboard";
import AreaManagerDashboard from "@/components/dashboard/views/area-manager-dashboard";
import SiteManagerDashboard from "@/components/dashboard/views/site-manager-dashboard";

export default function DashboardHome() {
  const context = useQuery(api.users.getMyContext);

  if (context === undefined) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!context?.primaryRole) {
    return null;
  }

  console.log("DASHBOARD ROLE:", context.primaryRole);

  switch (context.primaryRole) {
    case "SUPER_ADMIN":
      return <SuperAdminDashboard />;

    case "AREA_MANAGER":
      return <AreaManagerDashboard />;

    case "SITE_MANAGER":
      return <SiteManagerDashboard />;

    case "SUPERVISOR":
      return <SupervisorDashboard />;

    case "CLEANER":
      return <CleanerDashboard />;

    default:
      return <div className="p-8">Unknown role: </div>;
  }
}

// function SuperAdminDashboard({
//   firstName,
//   companyName,
// }: {
//   firstName?: string;
//   companyName?: string;
// }) {
//   return (
//     <div className="p-6 lg:p-8">
//       <p className="label-mono">Overview</p>

//       <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
//         {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
//       </h1>

//       <p className="mt-2 text-muted-foreground">
//         Here&apos;s what&apos;s happening across {companyName ?? "your company"}
//         .
//       </p>

//       <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
//         <MetricCard label="Active Sites" value="—" />

//         <MetricCard label="Team Members" value="—" />

//         <MetricCard label="Open Issues" value="—" />

//         <MetricCard label="Inspections Due" value="—" />
//       </div>
//     </div>
//   );
// }

function SupervisorDashboard() {
  return (
    <Placeholder
      title="Supervisor Dashboard"
      description="This dashboard will focus on today's team, tasks and inspections."
    />
  );
}

function CleanerDashboard() {
  return (
    <Placeholder
      title="Cleaner Dashboard"
      description="This will eventually become the cleaner's mobile-first work experience."
    />
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="label-mono">{label}</p>

      <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>

      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}
