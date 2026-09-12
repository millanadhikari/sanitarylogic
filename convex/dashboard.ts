import { query } from "./_generated/server";
import { requireUser } from "./lib/authorization";

export const getSuperAdminOverview = query({
  args: {},

  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const membership = await ctx.db
      .query("companyMembers")
      .withIndex("by_user", (q) =>
        q.eq("userId", user._id),
      )
      .first();

    if (
      !membership ||
      membership.status !== "ACTIVE"
    ) {
      throw new Error(
        "You do not belong to an active company",
      );
    }

    if (membership.role !== "SUPER_ADMIN") {
      throw new Error(
        "Super Admin access required",
      );
    }

    const companyId = membership.companyId;

    /*
     * ------------------------------------------------
     * Sites
     * ------------------------------------------------
     */

    const sites = await ctx.db
      .query("sites")
      .withIndex("by_company", (q) =>
        q.eq("companyId", companyId),
      )
      .collect();

    const activeSites = sites.filter(
      (site) => site.status === "ACTIVE",
    );

    /*
     * ------------------------------------------------
     * Company members
     * ------------------------------------------------
     */

    const companyMembers = await ctx.db
      .query("companyMembers")
      .withIndex("by_company", (q) =>
        q.eq("companyId", companyId),
      )
      .collect();

    const activeCompanyMembers =
      companyMembers.filter(
        (member) =>
          member.status === "ACTIVE",
      );

    const areaManagers =
      activeCompanyMembers.filter(
        (member) =>
          member.role === "AREA_MANAGER",
      );

    /*
     * ------------------------------------------------
     * Site assignments
     * ------------------------------------------------
     *
     * Site managers, supervisors and cleaners may
     * currently only exist through siteAssignments.
     *
     * We therefore collect unique user IDs across
     * both company membership and site assignments.
     */

    const siteAssignments = await ctx.db
      .query("siteAssignments")
      .withIndex("by_company", (q) =>
        q.eq("companyId", companyId),
      )
      .collect();

    const activeAssignments =
      siteAssignments.filter(
        (assignment) =>
          assignment.status === "ACTIVE",
      );

    const activeUserIds = new Set<string>();

    for (const member of activeCompanyMembers) {
      activeUserIds.add(
        member.userId.toString(),
      );
    }

    for (const assignment of activeAssignments) {
      activeUserIds.add(
        assignment.userId.toString(),
      );
    }

    return {
      totalSites: activeSites.length,

      areaManagers: areaManagers.length,

      activeStaff: activeUserIds.size,

      /*
       * We haven't built inspections/compliance yet.
       * Do not invent a percentage.
       */
      networkCompliance: null,

      /*
       * We'll populate these when Issues,
       * Inspections and activity tracking exist.
       */
      watchlist: [],

      recentActivity: [],
    };
  },
});

export const getAreaManagerOverview = query({
  args: {},

  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const membership = await ctx.db
      .query("companyMembers")
      .withIndex("by_user", (q) =>
        q.eq("userId", user._id),
      )
      .first();

    if (
      !membership ||
      membership.status !== "ACTIVE"
    ) {
      throw new Error(
        "You do not belong to an active company",
      );
    }

    if (
      membership.role !== "AREA_MANAGER"
    ) {
      throw new Error(
        "Area Manager access required",
      );
    }

    /*
     * Get this Area Manager's active
     * site assignments only.
     */
    const assignments = await ctx.db
      .query("siteAssignments")
      .withIndex("by_user", (q) =>
        q.eq("userId", user._id),
      )
      .collect();

    const activeAssignments =
      assignments.filter(
        (assignment) =>
          assignment.status === "ACTIVE" &&
          assignment.companyId ===
            membership.companyId,
      );

    const assignedSites = (
      await Promise.all(
        activeAssignments.map(
          async (assignment) => {
            const site = await ctx.db.get(
              assignment.siteId,
            );

            if (!site) {
              return null;
            }

            return {
              _id: site._id,
              name: site.name,
              code: site.code,
              address: site.address,
              suburb: site.suburb,
              state: site.state,
              postcode: site.postcode,
              status: site.status,
            };
          },
        ),
      )
    ).filter((site) => site !== null);

    /*
     * Find team members assigned to any
     * of this Area Manager's sites.
     */
    const assignedSiteIds = new Set(
      activeAssignments.map((assignment) =>
        assignment.siteId.toString(),
      ),
    );

    const companyAssignments = await ctx.db
      .query("siteAssignments")
      .withIndex("by_company", (q) =>
        q.eq(
          "companyId",
          membership.companyId,
        ),
      )
      .collect();

    const visibleAssignments =
      companyAssignments.filter(
        (assignment) =>
          assignment.status === "ACTIVE" &&
          assignedSiteIds.has(
            assignment.siteId.toString(),
          ),
      );

    /*
     * Unique users only.
     *
     * One cleaner may belong to more than
     * one of this manager's sites.
     */
    const teamUserIds = new Set(
      visibleAssignments.map(
        (assignment) =>
          assignment.userId.toString(),
      ),
    );

    /*
     * Don't count the Area Manager themselves
     * in the operational team count.
     */
    teamUserIds.delete(
      user._id.toString(),
    );

    return {
      assignedSites,

      stats: {
        totalSites:
          assignedSites.length,

        teamMembers:
          teamUserIds.size,

        /*
         * We haven't built these yet.
         */
        inspections: null,
        complianceAverage: null,
      },
    };
  },
});

export const getSiteManagerOverview = query({
  args: {},

  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const membership = await ctx.db
      .query("companyMembers")
      .withIndex("by_user", (q) =>
        q.eq("userId", user._id),
      )
      .first();

    if (
      !membership ||
      membership.status !== "ACTIVE"
    ) {
      throw new Error(
        "You do not belong to an active company",
      );
    }

    if (membership.role !== "SITE_MANAGER") {
      throw new Error(
        "Site Manager access required",
      );
    }

    /*
     * Site Managers currently have exactly
     * one active site assignment.
     */
    const assignments = await ctx.db
      .query("siteAssignments")
      .withIndex("by_user", (q) =>
        q.eq("userId", user._id),
      )
      .collect();

    const activeAssignments = assignments.filter(
      (assignment) =>
        assignment.status === "ACTIVE" &&
        assignment.companyId ===
          membership.companyId,
    );

    if (activeAssignments.length === 0) {
      return {
        site: null,

        stats: {
          teamMembers: 0,
          tenancies: 0,
          inspectionsDue: null,
          openIssues: null,
        },

        teamPreview: [],
        tenanciesPreview: [],
      };
    }

    /*
     * Our invitation flow enforces one site
     * for SITE_MANAGER.
     */
    const siteAssignment =
      activeAssignments[0];

    const site = await ctx.db.get(
      siteAssignment.siteId,
    );

    if (!site) {
      throw new Error(
        "Assigned site not found",
      );
    }

    /*
     * ----------------------------------------
     * Team
     * ----------------------------------------
     */

    const siteAssignments = await ctx.db
      .query("siteAssignments")
      .withIndex("by_site", (q) =>
        q.eq("siteId", site._id),
      )
      .collect();

    const activeSiteAssignments =
      siteAssignments.filter(
        (assignment) =>
          assignment.status === "ACTIVE" &&
          assignment.companyId ===
            membership.companyId,
      );

    const uniqueUserIds = [
      ...new Set(
        activeSiteAssignments.map(
          (assignment) =>
            assignment.userId.toString(),
        ),
      ),
    ];

    /*
     * Don't count the current Site Manager
     * in the team-member KPI.
     */
    const teamMemberIds =
      uniqueUserIds.filter(
        (userId) =>
          userId !== user._id.toString(),
      );

    const teamPreviewResults =
      await Promise.all(
        activeSiteAssignments
          .filter(
            (assignment) =>
              assignment.userId !==
              user._id,
          )
          .map(async (assignment) => {
            const teamUser =
              await ctx.db.get(
                assignment.userId,
              );

            if (!teamUser) {
              return null;
            }

            return {
              userId: teamUser._id,

              firstName:
                teamUser.firstName,

              lastName:
                teamUser.lastName,

              email:
                teamUser.email,

              role:
                assignment.role,
            };
          }),
      );

    /*
     * A person should only appear once,
     * although our site assignment model
     * should already prevent duplicates.
     */
    const seenUsers =
      new Set<string>();

    const teamPreview =
      teamPreviewResults
        .filter(
          (member) =>
            member !== null,
        )
        .filter((member) => {
          const id =
            member.userId.toString();

          if (
            seenUsers.has(id)
          ) {
            return false;
          }

          seenUsers.add(id);

          return true;
        })
        .slice(0, 5);

    /*
     * ----------------------------------------
     * Tenancies
     * ----------------------------------------
     */

    const tenancies = await ctx.db
      .query("tenancies")
      .withIndex("by_site", (q) =>
        q.eq("siteId", site._id),
      )
      .collect();

    const activeTenancies =
      tenancies.filter(
        (tenancy) =>
          tenancy.status === "ACTIVE",
      );

    const tenanciesPreview =
      activeTenancies
        .slice(0, 5)
        .map((tenancy) => ({
          _id: tenancy._id,
          name: tenancy.name,
          floor: tenancy.floor,
          contactName:
            tenancy.contactName,
        }));

    return {
      site: {
        _id: site._id,
        name: site.name,
        code: site.code,

        address: site.address,
        suburb: site.suburb,
        state: site.state,
        postcode: site.postcode,

        status: site.status,
      },

      stats: {
        teamMembers:
          teamMemberIds.length,

        tenancies:
          activeTenancies.length,

        /*
         * These become real once those
         * modules are implemented.
         */
        inspectionsDue: null,
        openIssues: null,
      },

      teamPreview,

      tenanciesPreview,
    };
  },
});