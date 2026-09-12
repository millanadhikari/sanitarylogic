"use client";

import {
  ReactNode,
  useState,
} from "react";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { api } from "@/convex/_generated/api";

import AppSidebar from "./app-sidebar";
import DashboardHeader from "./dashboard-header";
import type { AppRole } from "./navigation";

export default function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const context = useQuery(
    api.users.getMyContext,
  );

  const [mobileOpen, setMobileOpen] =
    useState(false);

  useEffect(() => {
    if (context === undefined) {
      return;
    }

    /*
     * Authenticated Clerk user hasn't been
     * provisioned into the application.
     */
    if (!context) {
      router.replace(
        "/auth/redirect",
      );

      return;
    }

    /*
     * A user without a role/company context
     * hasn't completed onboarding or hasn't
     * accepted an invitation yet.
     */
    if (!context.primaryRole) {
      router.replace(
        "/onboarding",
      );
    }
  }, [context, router]);

  if (
    context === undefined ||
    !context ||
    !context.primaryRole
  ) {
    return (
      <div className="grid-canvas flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />

          <p className="mt-4 text-sm text-muted-foreground">
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  const role =
    context.primaryRole as AppRole;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        role={role}
        company={
          context.company
            ? {
                name:
                  context.company.name,
              }
            : null
        }
        siteAssignments={
          context.siteAssignments
        }
        mobileOpen={mobileOpen}
        onMobileClose={() =>
          setMobileOpen(false)
        }
      />

      <div className="lg:pl-72">
        <DashboardHeader
          role={role}
          companyName={
            context.company?.name
          }
          firstName={
            context.user.firstName
          }
          onMenuClick={() =>
            setMobileOpen(true)
          }
        />

        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}