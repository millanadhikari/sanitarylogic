"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brush,
  ChevronRight,
  X,
} from "lucide-react";

import {
  AppRole,
  getNavigationForRole,
} from "./navigation";

type SiteAssignment = {
  assignmentId: string;
  siteId: string;
  siteName: string;
  siteCode?: string;
  companyId: string;
  role:
    | "AREA_MANAGER"
    | "SITE_MANAGER"
    | "SUPERVISOR"
    | "CLEANER";
};

type AppSidebarProps = {
  role: AppRole;

  company: {
    name: string;
  } | null;

  siteAssignments: SiteAssignment[];

  mobileOpen: boolean;

  onMobileClose: () => void;
};

export default function AppSidebar({
  role,
  company,
  siteAssignments,
  mobileOpen,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname();

  const sections =
    getNavigationForRole(role);

  const primarySite =
    siteAssignments.length === 1
      ? siteAssignments[0]
      : null;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-72 flex-col
          border-r border-border bg-card
          transition-transform duration-200
          lg:translate-x-0
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Brush className="h-5 w-5" />
            </div>

            <span className="text-lg font-bold tracking-tight text-foreground">
              Sanitary Logic
            </span>
          </Link>

          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Company */}
        <div className="border-b border-border px-4 py-4">
          <p className="label-mono">
            Company
          </p>

          <p className="mt-1 truncate text-sm font-semibold text-foreground">
            {company?.name ??
              "Sanitary Logic"}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {formatRole(role)}
          </p>
        </div>

        {/* Site context */}
        {primarySite &&
          role !== "SUPER_ADMIN" && (
            <div className="border-b border-border px-4 py-4">
              <p className="label-mono">
                Current Site
              </p>

              <Link
                href={`/dashboard/sites/${primarySite.siteId}`}
                onClick={onMobileClose}
                className="mt-2 flex items-center justify-between rounded-md bg-muted px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {primarySite.siteName}
                  </p>

                  {primarySite.siteCode && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {
                        primarySite.siteCode
                      }
                    </p>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </div>
          )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="space-y-7">
            {sections.map(
              (section, sectionIndex) => (
                <div key={sectionIndex}>
                  {section.title && (
                    <p className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {section.title}
                    </p>
                  )}

                  <div className="space-y-1">
                    {section.items.map(
                      (item) => {
                        const Icon =
                          item.icon;

                        const active =
                          item.href ===
                          "/dashboard"
                            ? pathname ===
                              "/dashboard"
                            : pathname.startsWith(
                                item.href,
                              );

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={
                              onMobileClose
                            }
                            className={`
                              flex h-10 items-center gap-3
                              rounded-md px-3 text-sm
                              font-medium transition-colors
                              ${
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }
                            `}
                          >
                            <Icon className="h-4 w-4" />

                            {item.title}
                          </Link>
                        );
                      },
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        </nav>

        <div className="border-t border-border px-5 py-4">
          <p className="text-xs text-muted-foreground">
            Sanitary Logic CRM
          </p>
        </div>
      </aside>
    </>
  );
}

function formatRole(role: AppRole) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}