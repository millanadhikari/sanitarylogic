import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

type AuthCtx = QueryCtx | MutationCtx;

export async function requireUser(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("Authenticated user does not have an application account");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("User account is inactive");
  }

  return user;
}

export async function requireCompanyMember(
  ctx: AuthCtx,
  companyId: Id<"companies">,
) {
  const user = await requireUser(ctx);

  const membership = await ctx.db
    .query("companyMembers")
    .withIndex("by_user_and_company", (q) =>
      q.eq("userId", user._id).eq("companyId", companyId),
    )
    .unique();

  if (!membership) {
    throw new Error("You do not have access to this company");
  }

  if (membership.status !== "ACTIVE") {
    throw new Error("Company membership is inactive");
  }

  return {
    user,
    membership,
  };
}

export type CompanyRole =
  "SUPER_ADMIN" | "AREA_MANAGER" | "SITE_MANAGER" | "SUPERVISOR" | "CLEANER";

export async function requireCompanyRole(
  ctx: AuthCtx,
  companyId: Id<"companies">,
  roles: CompanyRole[],
) {
  const result = await requireCompanyMember(ctx, companyId);

  if (!roles.includes(result.membership.role)) {
    throw new Error("Insufficient permissions");
  }

  return result;
}

export async function requireSiteAccess(ctx: AuthCtx, siteId: Id<"sites">) {
  const user = await requireUser(ctx);

  const site = await ctx.db.get(siteId);

  if (!site) {
    throw new Error("Site not found");
  }

  // Super Admin automatically has access
  // to every site belonging to their company.
  const companyMembership = await ctx.db
    .query("companyMembers")
    .withIndex("by_user_and_company", (q) =>
      q.eq("userId", user._id).eq("companyId", site.companyId),
    )
    .unique();

  if (
    companyMembership?.status === "ACTIVE" &&
    companyMembership.role === "SUPER_ADMIN"
  ) {
    return {
      user,
      site,
      role: "SUPER_ADMIN" as const,
    };
  }

  // Everyone else needs a site assignment.
  const assignment = await ctx.db
    .query("siteAssignments")
    .withIndex("by_user_and_site", (q) =>
      q.eq("userId", user._id).eq("siteId", siteId),
    )
    .unique();

  if (!assignment || assignment.status !== "ACTIVE") {
    throw new Error("You do not have access to this site");
  }

  return {
    user,
    site,
    role: assignment.role,
  };
}

export async function requireTenancyAccess(
  ctx: AuthCtx,
  tenancyId: Id<"tenancies">,
) {
  const tenancy = await ctx.db.get(tenancyId);

  if (!tenancy) {
    throw new Error("Tenancy not found");
  }

  const access = await requireSiteAccess(ctx, tenancy.siteId);

  return {
    ...access,
    tenancy,
  };
}

export async function requireAreaAccess(ctx: AuthCtx, areaId: Id<"areas">) {
  const area = await ctx.db.get(areaId);

  if (!area) {
    throw new Error("Area not found");
  }

  const access = await requireTenancyAccess(ctx, area.tenancyId);

  return {
    ...access,
    area,
  };
}

export async function requireTenancyManagementAccess(
  ctx: AuthCtx,
  siteId: Id<"sites">,
) {
  const access = await requireSiteAccess(ctx, siteId);

  if (
    access.role !== "SUPER_ADMIN" &&
    access.role !== "AREA_MANAGER" &&
    access.role !== "SITE_MANAGER"
  ) {
    throw new Error(
      "You do not have permission to manage tenancies at this site",
    );
  }

  return access;
}

export async function requireWorkOrderManagementAccess(
  ctx: AuthCtx,
  tenancyId: Id<"tenancies">,
) {
  const access = await requireTenancyAccess(ctx, tenancyId);

  if (
    access.role !== "SUPER_ADMIN" &&
    access.role !== "AREA_MANAGER" &&
    access.role !== "SITE_MANAGER" &&
    access.role !== "SUPERVISOR"
  ) {
    throw new Error("You do not have permission to manage work orders");
  }

  return access;
}

export async function requireComplaintManagementAccess(
  ctx: AuthCtx,
  tenancyId: Id<"tenancies">,
) {
  const access = await requireTenancyAccess(ctx, tenancyId);

  if (
    access.role !== "SUPER_ADMIN" &&
    access.role !== "AREA_MANAGER" &&
    access.role !== "SITE_MANAGER" &&
    access.role !== "SUPERVISOR"
  ) {
    throw new Error("You do not have permission to manage complaints");
  }

  return access;
}

export async function requireSiteScopeManagementAccess(
  ctx: AuthCtx,
  siteId: Id<"sites">,
) {
  const access = await requireSiteAccess(ctx, siteId);

  if (
    access.role !== "SUPER_ADMIN" &&
    access.role !== "AREA_MANAGER" &&
    access.role !== "SITE_MANAGER"
  ) {
    throw new Error(
      "You do not have permission to manage Periodic Planner scope at this site",
    );
  }

  return access;
}

export async function requirePlannerCompletionAccess(
  ctx: AuthCtx,
  siteId: Id<"sites">,
) {
  const access = await requireSiteAccess(ctx, siteId);

  if (
    access.role !== "SUPER_ADMIN" &&
    access.role !== "AREA_MANAGER" &&
    access.role !== "SITE_MANAGER" &&
    access.role !== "SUPERVISOR"
  ) {
    throw new Error(
      "You do not have permission to complete Periodic Planner work at this site",
    );
  }

  return access;
}

export async function requireAssetMasterManagementAccess(ctx: AuthCtx, siteId: Id<"sites">) {
  const access = await requireSiteAccess(ctx, siteId);
  if (access.role !== "SUPER_ADMIN" && access.role !== "AREA_MANAGER" && access.role !== "SITE_MANAGER") {
    throw new Error("You do not have permission to manage asset master data");
  }
  return access;
}

export async function requireAssetOperationsAccess(ctx: AuthCtx, siteId: Id<"sites">) {
  const access = await requireSiteAccess(ctx, siteId);
  if (access.role === "CLEANER") throw new Error("You do not have permission to manage asset records");
  return access;
}
