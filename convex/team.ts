import { query } from "./_generated/server";
import { requireUser } from "./lib/authorization";

export const getMyCompanyTeam = query({
  args: {},

  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const membership = await ctx.db
      .query("companyMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!membership || membership.status !== "ACTIVE") {
      throw new Error("You do not belong to an active company");
    }

    if (
      membership.role !== "SUPER_ADMIN" &&
      membership.role !== "AREA_MANAGER" &&
      membership.role !== "SITE_MANAGER"
    ) {
      throw new Error("You do not have permission to view the team");
    }

    /*
     * ------------------------------------------------
     * Determine which users are visible
     * ------------------------------------------------
     */

    let visibleUserIds: Set<string> | null = null;

    let visibleSiteIds: Set<string> | null = null;

    if (membership.role === "SUPER_ADMIN") {
      visibleUserIds = null;
      visibleSiteIds = null;
    }

    if (
      membership.role === "AREA_MANAGER" ||
      membership.role === "SITE_MANAGER"
    ) {
      const myAssignments = await ctx.db
        .query("siteAssignments")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      visibleSiteIds = new Set(
        myAssignments
          .filter(
            (assignment) =>
              assignment.status === "ACTIVE" &&
              assignment.companyId === membership.companyId,
          )
          .map((assignment) => assignment.siteId.toString()),
      );

      const companyAssignments = await ctx.db
        .query("siteAssignments")
        .withIndex("by_company", (q) => q.eq("companyId", membership.companyId))
        .collect();

      visibleUserIds = new Set(
        companyAssignments
          .filter(
            (assignment) =>
              assignment.status === "ACTIVE" &&
              visibleSiteIds!.has(assignment.siteId.toString()),
          )
          .map((assignment) => assignment.userId.toString()),
      );

      visibleUserIds.add(user._id.toString());
    }

    /*
     * ------------------------------------------------
     * Get company members
     * ------------------------------------------------
     */

    const members = await ctx.db
      .query("companyMembers")
      .withIndex("by_company", (q) => q.eq("companyId", membership.companyId))
      .collect();

    const visibleMembers =
      visibleUserIds === null
        ? members
        : members.filter((member) =>
            visibleUserIds.has(member.userId.toString()),
          );

    /*
     * ------------------------------------------------
     * Build response
     * ------------------------------------------------
     */

    const results = await Promise.all(
      visibleMembers.map(async (member) => {
        const memberUser = await ctx.db.get(member.userId);

        if (!memberUser) {
          return null;
        }

        const assignments = await ctx.db
          .query("siteAssignments")
          .withIndex("by_user", (q) => q.eq("userId", member.userId))
          .collect();

        /*
         * Only show assignments belonging
         * to this company.
         */
        const activeAssignments = assignments.filter((assignment) => {
          if (
            assignment.status !== "ACTIVE" ||
            assignment.companyId !== membership.companyId
          ) {
            return false;
          }

          if (
            visibleSiteIds !== null &&
            !visibleSiteIds.has(assignment.siteId.toString())
          ) {
            return false;
          }

          return true;
        });

        const assignedSites = (
          await Promise.all(
            activeAssignments.map(async (assignment) => {
              const site = await ctx.db.get(assignment.siteId);

              if (!site) {
                return null;
              }

              /*
               * Area/Site Managers should
               * only see sites within their
               * own scope.
               */
              if (
                visibleUserIds !== null &&
                membership.role !== "SUPER_ADMIN"
              ) {
                const currentUserAssignments = await ctx.db
                  .query("siteAssignments")
                  .withIndex("by_user_and_site", (q) =>
                    q.eq("userId", user._id).eq("siteId", site._id),
                  )
                  .unique();

                if (
                  !currentUserAssignments ||
                  currentUserAssignments.status !== "ACTIVE"
                ) {
                  return null;
                }
              }

              return {
                siteId: site._id,
                name: site.name,
                code: site.code,
                role: assignment.role,
              };
            }),
          )
        ).filter((site) => site !== null);

        return {
          membershipId: member._id,

          userId: memberUser._id,

          firstName: memberUser.firstName,

          lastName: memberUser.lastName,

          email: memberUser.email,

          // imageUrl:
          //   memberUser.imageUrl,

          role: member.role,

          status: member.status,

          assignedSites,

          createdAt: member.createdAt,
        };
      }),
    );

    return results.filter((member) => member !== null);
  },
});
