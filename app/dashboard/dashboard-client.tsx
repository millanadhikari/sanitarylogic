"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function DashboardClient() {
  const router = useRouter();

  const { isAuthenticated, isLoading } = useConvexAuth();

  const companyData = useQuery(
    api.companies.getMyCompany,
    isAuthenticated ? {} : "skip",
  );
  const context = useQuery(api.users.getMyContext);

  console.log("USER CONTEXT:", context);

  useEffect(() => {
    if (companyData === null) {
      router.replace("/onboarding");
    }
  }, [companyData, router]);

  if (isLoading || companyData === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!companyData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Redirecting...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-zinc-500">Dashboard</p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {companyData.company.name}
          </h1>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-6">
            <p className="text-sm text-zinc-500">Your role</p>

            <p className="mt-2 text-lg font-semibold">
              {companyData.membership.role.replace("_", " ")}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <p className="text-sm text-zinc-500">Sites</p>
            <p className="mt-2 text-3xl font-semibold">0</p>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <p className="text-sm text-zinc-500">Team members</p>
            <p className="mt-2 text-3xl font-semibold">1</p>
          </div>
        </div>
        <Link
          href="/dashboard/sites"
          className="inline-flex rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white"
        >
          Manage sites
        </Link>
      </div>
    </main>
  );
}
