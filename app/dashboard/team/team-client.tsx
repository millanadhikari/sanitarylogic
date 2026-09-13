"use client";

import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Check,
  Loader2,
  Mail,
  Plus,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { EmployeeDirectory } from "@/components/team/employee-directory";

export default function TeamClient() {
  const [view, setView] = useState<"MANAGEMENT" | "EMPLOYEES">("EMPLOYEES");
  return (
    <div>
      <div className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-8">
        <div className="inline-flex rounded-xl border bg-card p-1">
          <button onClick={() => setView("EMPLOYEES")} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === "EMPLOYEES" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Employees / Cleaners</button>
          <button onClick={() => setView("MANAGEMENT")} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === "MANAGEMENT" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Management Users</button>
        </div>
      </div>
      {view === "EMPLOYEES" ? <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8"><EmployeeDirectory /></div> : <ManagementTeam />}
    </div>
  );
}

function ManagementTeam() {
  type InviteRole = "AREA_MANAGER" | "SITE_MANAGER" | "SUPERVISOR" | "CLEANER";

  const [inviteForm, setInviteForm] = useState<{
    email: string;
    role: InviteRole;
    siteIds: Id<"sites">[];
  }>({
    email: "",
    role: "AREA_MANAGER",
    siteIds: [],
  });

  const [inviteLoading, setInviteLoading] = useState(false);

  const [inviteError, setInviteError] = useState("");
  const context = useQuery(api.users.getMyContext);

  const team = useQuery(api.team.getMyCompanyTeam);

  const [search, setSearch] = useState("");
  const sites = useQuery(api.sites.getMySites);

  const invitations = useQuery(
    api.invitations.getMyCompanyInvitations,
    context?.primaryRole === "SUPER_ADMIN" ? {} : "skip",
  );

  const sendInvitation = useAction(api.invitations.send);

  const [showInviteModal, setShowInviteModal] = useState(false);

  if (context === undefined || team === undefined) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!context) {
    return null;
  }

  const canInvite = context.primaryRole === "SUPER_ADMIN";

  const normalizedSearch = search.trim().toLowerCase();

  const filteredTeam = team.filter((member) => {
    if (!normalizedSearch) {
      return true;
    }

    const fullName = [member.firstName, member.lastName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      fullName.includes(normalizedSearch) ||
      member.email?.toLowerCase().includes(normalizedSearch) ||
      member.role.toLowerCase().includes(normalizedSearch)
    );
  });

  const activeMembers = team.filter(
    (member) => member.status === "ACTIVE",
  ).length;

  const areaManagers = team.filter(
    (member) => member.status === "ACTIVE" && member.role === "AREA_MANAGER",
  ).length;

  const cleaners = team.filter(
    (member) => member.status === "ACTIVE" && member.role === "CLEANER",
  ).length;
  async function handleInvite() {
    if (!inviteForm.email.trim()) {
      setInviteError("Email address is required.");

      return;
    }

    if (inviteForm.role !== "CLEANER" && inviteForm.siteIds.length === 0) {
      setInviteError("Select at least one site.");

      return;
    }

    if (
      (inviteForm.role === "SITE_MANAGER" ||
        inviteForm.role === "SUPERVISOR") &&
      inviteForm.siteIds.length !== 1
    ) {
      setInviteError("Select exactly one site for this role.");

      return;
    }

    try {
      setInviteLoading(true);
      setInviteError("");

      await sendInvitation({
        email: inviteForm.email.trim(),

        role: inviteForm.role,

        siteIds: inviteForm.siteIds,
      });

      toast.success("Invitation sent successfully.");

      setInviteForm({
        email: "",
        role: "AREA_MANAGER",
        siteIds: [],
      });

      setShowInviteModal(false);
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error ? error.message : "Unable to send invitation.";

      setInviteError(message);

      toast.error("Invitation could not be sent.");
    } finally {
      setInviteLoading(false);
    }
  }
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-muted-foreground">People</p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-[2.5rem]">
            Team
          </h1>

          <p className="mt-1 text-muted-foreground">
            Manage people across {context.company?.name}.
          </p>
        </div>

        {canInvite && (
          <Button
            onClick={() => setShowInviteModal(true)}
            className="h-12 gap-2 rounded-xl font-semibold"
          >
            <Plus className="size-4" />
            Invite Team Member
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Team" value={activeMembers} icon={Users} />

        <StatCard label="Area Managers" value={areaManagers} icon={UserRound} />

        <StatCard label="Cleaners" value={cleaners} icon={Users} />
      </div>

      {/* Team directory */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Company Directory
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {team.length} {team.length === 1 ? "member" : "members"}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search team..."
              className="search-input h-10 w-full rounded-lg border border-border bg-background pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        {filteredTeam.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto size-8 text-muted-foreground" />

            <p className="mt-4 font-bold">No team members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <TableHeading>Team Member</TableHeading>

                  <TableHeading>Role</TableHeading>

                  <TableHeading>Sites</TableHeading>

                  <TableHeading>Status</TableHeading>

                  <TableHeading>Contact</TableHeading>
                </tr>
              </thead>

              <tbody>
                {filteredTeam.map((member) => {
                  const name =
                    [member.firstName, member.lastName]
                      .filter(Boolean)
                      .join(" ") || "Unnamed User";

                  return (
                    <tr
                      key={member.membershipId}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                            {getInitials(member.firstName, member.lastName)}
                          </div>

                          <div>
                            <p className="font-bold">{name}</p>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Joined {formatDate(member.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <RoleBadge role={member.role} />
                      </td>

                      <td className="px-6 py-4">
                        {member.role === "SUPER_ADMIN" ? (
                          <span className="text-sm text-muted-foreground">
                            All sites
                          </span>
                        ) : member.assignedSites.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            No sites
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {member.assignedSites.slice(0, 2).map((site) => (
                              <span
                                key={site.siteId}
                                className="rounded-md bg-muted px-2 py-1 text-xs font-medium"
                              >
                                {site.name}
                              </span>
                            ))}

                            {member.assignedSites.length > 2 && (
                              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
                                +{member.assignedSites.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={member.status} />
                      </td>

                      <td className="px-6 py-4">
                        {member.email ? (
                          <a
                            href={`mailto:${member.email}`}
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                          >
                            <Mail className="size-4" />

                            {member.email}
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {canInvite &&
        invitations !== undefined &&
        invitations.filter((invitation) => invitation.status === "PENDING")
          .length > 0 && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <h2 className="text-xl font-extrabold tracking-tight">
                Pending Invitations
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Invitations awaiting acceptance.
              </p>
            </div>

            <div className="divide-y divide-border">
              {invitations
                .filter((invitation) => invitation.status === "PENDING")
                .map((invitation) => (
                  <div
                    key={invitation._id}
                    className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
                  >
                    <div>
                      <p className="font-bold">{invitation.email}</p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatRole(invitation.role)}
                      </p>
                    </div>

                    <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                      Pending
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            {/* Header */}
            <div className="border-b border-border px-6 py-5">
              <h2 className="text-xl font-extrabold tracking-tight">
                Invite Team Member
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Invite someone to {context.company?.name} and configure their
                access.
              </p>
            </div>

            <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="label-caps text-muted-foreground">
                  Email Address
                </label>

                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(event) =>
                    setInviteForm((current) => ({
                      ...current,

                      email: event.target.value,
                    }))
                  }
                  placeholder="manager@company.com"
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="label-caps text-muted-foreground">Role</label>

                <select
                  value={inviteForm.role}
                  onChange={(event) => {
                    const role = event.target.value as InviteRole;

                    setInviteForm((current) => ({
                      ...current,
                      role,

                      // Changing role resets
                      // site selection.
                      siteIds: [],
                    }));
                  }}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
                >
                  <option value="AREA_MANAGER">Area Manager</option>

                  <option value="SITE_MANAGER">Site Manager</option>

                  <option value="SUPERVISOR">Supervisor</option>

                  <option value="CLEANER">Cleaner</option>
                </select>
              </div>

              {/* Explanation */}
              <RoleExplanation role={inviteForm.role} />

              {/* Site Access */}
              <div className="space-y-3">
                <div>
                  <label className="label-caps text-muted-foreground">
                    Site Access
                  </label>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {inviteForm.role === "SITE_MANAGER" ||
                    inviteForm.role === "SUPERVISOR"
                      ? "Select one site."
                      : "Select the sites this person can access."}
                  </p>
                </div>

                {sites === undefined ? (
                  <p className="text-sm text-muted-foreground">
                    Loading sites...
                  </p>
                ) : sites.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    Create a site before assigning this role.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sites.map((site) => {
                      const selected = inviteForm.siteIds.includes(site._id);

                      const singleSite =
                        inviteForm.role === "SITE_MANAGER" ||
                        inviteForm.role === "SUPERVISOR";

                      return (
                        <button
                          key={site._id}
                          type="button"
                          onClick={() => {
                            setInviteForm((current) => {
                              if (singleSite) {
                                return {
                                  ...current,

                                  siteIds: selected ? [] : [site._id],
                                };
                              }

                              return {
                                ...current,

                                siteIds: selected
                                  ? current.siteIds.filter(
                                      (id) => id !== site._id,
                                    )
                                  : [...current.siteIds, site._id],
                              };
                            });
                          }}
                          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div>
                            <p className="font-semibold">{site.name}</p>

                            {site.code && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {site.code}
                              </p>
                            )}
                          </div>

                          <div
                            className={`flex size-5 items-center justify-center rounded border ${
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border"
                            }`}
                          >
                            {selected && <Check className="size-3.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {inviteError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
                  <p className="text-sm text-destructive">{inviteError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="outline"
                disabled={inviteLoading}
                onClick={() => {
                  setShowInviteModal(false);

                  setInviteError("");
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>

              <Button
                type="button"
                disabled={inviteLoading || !inviteForm.email.trim()}
                onClick={handleInvite}
                className="gap-2 rounded-xl"
              >
                {inviteLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="size-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="label-caps text-muted-foreground">{label}</p>

        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-[18px]" />
        </span>
      </div>

      <p className="mt-4 text-[2.5rem] font-extrabold leading-none tracking-tight">
        {value}
      </p>
    </div>
  );
}

function TableHeading({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-left">
      <span className="label-caps text-muted-foreground">{children}</span>
    </th>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
      {formatRole(role)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";

  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function formatRole(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitials(firstName?: string, lastName?: string) {
  const first = firstName?.charAt(0) ?? "";

  const last = lastName?.charAt(0) ?? "";

  return `${first}${last}`.toUpperCase() || "?";
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function RoleExplanation({
  role,
}: {
  role: "AREA_MANAGER" | "SITE_MANAGER" | "SUPERVISOR" | "CLEANER";
}) {
  const descriptions = {
    AREA_MANAGER: "Can manage operations across multiple assigned sites.",

    SITE_MANAGER: "Manages the operations of one assigned site.",

    SUPERVISOR:
      "Handles daily operational work and staff supervision at one site.",

    CLEANER: "Can access their assigned cleaning work, tasks and sites.",
  };

  return (
    <div className="rounded-xl bg-muted/60 px-4 py-3">
      <p className="text-sm leading-6 text-muted-foreground">
        {descriptions[role]}
      </p>
    </div>
  );
}
