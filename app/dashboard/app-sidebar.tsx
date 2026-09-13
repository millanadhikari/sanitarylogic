"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Brush,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
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

  collapsed: boolean;

  firstName?: string;

  onCollapsedChange: (
    collapsed: boolean,
  ) => void;

  onMobileClose: () => void;
};

export default function AppSidebar({
  role,
  company,
  siteAssignments,
  mobileOpen,
  collapsed,
  firstName,
  onCollapsedChange,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname();

  const sections =
    getNavigationForRole(role);

  const primarySite =
    siteAssignments.length === 1
      ? siteAssignments[0]
      : role === "SITE_MANAGER"
        ? siteAssignments[0] ?? null
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
          shadow-xl transition-[transform,width] duration-300 ease-out
          motion-reduce:transition-none
          lg:bottom-3 lg:left-3 lg:top-3 lg:translate-x-0
          lg:rounded-2xl lg:border lg:shadow-sm
          ${collapsed ? "lg:w-[68px]" : "lg:w-64"}
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* Logo */}
        <div
          className={`flex h-16 shrink-0 items-center justify-between border-b border-border px-4 ${
            collapsed
              ? "lg:justify-center"
              : ""
          }`}
        >
          <Link
            href="/dashboard"
            onClick={onMobileClose}
            className="flex min-w-0 items-center gap-2.5"
            aria-label={
              collapsed
                ? "Sanitary Logic dashboard"
                : undefined
            }
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Brush className="size-4.5" />
            </div>

            <span
              className={`truncate text-lg font-bold tracking-tight text-foreground ${
                collapsed
                  ? "lg:hidden"
                  : ""
              }`}
            >
              Sanitary Logic
            </span>
          </Link>

          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Site context */}
        {primarySite &&
          role !== "SUPER_ADMIN" && (
            <div
              className={`border-b border-border px-3 py-3 ${
                collapsed
                  ? "lg:px-2"
                  : ""
              }`}
            >
              <p
                className={`label-mono px-1 ${
                  collapsed
                    ? "lg:hidden"
                    : ""
                }`}
              >
                Current Site
              </p>

              <Link
                href={`/dashboard/sites/${primarySite.siteId}`}
                onClick={onMobileClose}
                aria-label={
                  collapsed
                    ? `Current Site: ${primarySite.siteName}`
                    : undefined
                }
                title={
                  collapsed
                    ? primarySite.siteName
                    : undefined
                }
                className={`group/site relative mt-2 flex items-center justify-between rounded-xl bg-muted/70 px-3 py-2.5 text-foreground transition-colors hover:bg-muted ${
                  collapsed
                    ? "lg:mt-0 lg:justify-center lg:px-0"
                    : ""
                }`}
              >
                <Building2
                  className={`size-4 shrink-0 text-primary ${
                    collapsed
                      ? "lg:block"
                      : "hidden"
                  }`}
                />

                <div
                  className={`min-w-0 ${
                    collapsed
                      ? "lg:hidden"
                      : ""
                  }`}
                >
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

                <ChevronRight
                  className={`size-4 shrink-0 text-muted-foreground ${
                    collapsed
                      ? "lg:hidden"
                      : ""
                  }`}
                />

                {collapsed && (
                  <SidebarTooltip>
                    {primarySite.siteName}
                  </SidebarTooltip>
                )}
              </Link>
            </div>
          )}

        {/* Navigation */}
        <nav
          aria-label="Dashboard navigation"
          className={`flex-1 overflow-y-auto px-3 py-5 ${
            collapsed
              ? "lg:overflow-visible lg:px-2"
              : ""
          }`}
        >
          <div
            className={
              collapsed
                ? "space-y-7 lg:space-y-4"
                : "space-y-7"
            }
          >
            {sections.map(
              (section, sectionIndex) => (
                <div key={sectionIndex}>
                  {section.title && (
                    <>
                      <p
                        className={`mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground ${
                          collapsed
                            ? "lg:hidden"
                            : ""
                        }`}
                      >
                        {section.title}
                      </p>
                      {collapsed && (
                        <div className="mx-2 mb-3 hidden h-px bg-border lg:block" />
                      )}
                    </>
                  )}

                  <div className="space-y-1">
                    {section.items.map(
                      (item) => {
                        const href = item.href.includes(":siteId")
                          ? primarySite
                            ? item.href.replace(":siteId", primarySite.siteId)
                            : null
                          : item.href;
                        if (!href) return null;
                        const Icon =
                          item.icon;

                        const active =
                          href ===
                          "/dashboard"
                            ? pathname ===
                              "/dashboard"
                            : pathname.startsWith(
                                href,
                              );

                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={
                              onMobileClose
                            }
                            aria-current={
                              active
                                ? "page"
                                : undefined
                            }
                            aria-label={
                              collapsed
                                ? item.title
                                : undefined
                            }
                            title={
                              collapsed
                                ? item.title
                                : undefined
                            }
                            className={`group/nav relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 ${
                              collapsed
                                ? "lg:justify-center lg:gap-0 lg:px-0"
                                : ""
                            }
                              ${
                                active
                                  ? "bg-primary/10 text-primary ring-1 ring-primary/10"
                                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                              }
                            `}
                          >
                            <Icon className="size-[18px] shrink-0" />

                            <span
                              className={
                                collapsed
                                  ? "lg:hidden"
                                  : ""
                              }
                            >
                              {item.title}
                            </span>

                            {collapsed && (
                              <SidebarTooltip>
                                {item.title}
                              </SidebarTooltip>
                            )}
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

        <div
          className={`shrink-0 border-t border-border p-3 ${
            collapsed
              ? "lg:px-2"
              : ""
          }`}
        >
          <div
            className={`flex items-center gap-3 rounded-xl bg-muted/50 p-2 ${
              collapsed
                ? "lg:justify-center lg:gap-0"
                : ""
            }`}
            title={
              collapsed
                ? `${firstName ?? company?.name ?? "Account"} · ${formatRole(role)}`
                : undefined
            }
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-extrabold text-primary">
              {initials(
                firstName ??
                  company?.name ??
                  "SL",
              )}
            </span>
            <div
              className={`min-w-0 flex-1 ${
                collapsed
                  ? "lg:hidden"
                  : ""
              }`}
            >
              <p className="truncate text-sm font-semibold text-foreground">
                {firstName ??
                  company?.name ??
                  "Account"}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {formatRole(role)}
              </p>
            </div>
          </div>

        </div>

        <button
          type="button"
          onClick={() =>
            onCollapsedChange(!collapsed)
          }
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          title={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          className="absolute -right-3 top-5 hidden size-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 lg:flex"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-3.5" />
          ) : (
            <PanelLeftClose className="size-3.5" />
          )}
        </button>
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

function SidebarTooltip({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-[60] hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs font-semibold text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover/nav:opacity-100 group-focus-visible/nav:opacity-100 group-hover/site:opacity-100 group-focus-visible/site:opacity-100 lg:block"
    >
      {children}
    </span>
  );
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
