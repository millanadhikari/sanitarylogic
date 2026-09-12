import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";

import {
  v,
} from "convex/values";

import {
  internal,
} from "./_generated/api";

import {
  Id,
} from "./_generated/dataModel";

const invitationRole = v.union(
  v.literal("AREA_MANAGER"),
  v.literal("SITE_MANAGER"),
  v.literal("SUPERVISOR"),
  v.literal("CLEANER"),
);

/*
 * --------------------------------------------------
 * Public: list invitations
 * --------------------------------------------------
 */

export const getMyCompanyInvitations = query({
  args: {},

  handler: async (ctx) => {
    const identity =
      await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_clerk_user_id",
        (q) =>
          q.eq(
            "clerkUserId",
            identity.subject,
          ),
      )
      .unique();

    if (!user) {
      throw new Error(
        "User account not found",
      );
    }

    const membership = await ctx.db
      .query("companyMembers")
      .withIndex("by_user", (q) =>
        q.eq("userId", user._id),
      )
      .first();

    if (
      !membership ||
      membership.status !== "ACTIVE" ||
      membership.role !== "SUPER_ADMIN"
    ) {
      throw new Error(
        "Super Admin access required",
      );
    }

    return await ctx.db
      .query("invitations")
      .withIndex("by_company", (q) =>
        q.eq(
          "companyId",
          membership.companyId,
        ),
      )
      .order("desc")
      .collect();
  },
});

/*
 * --------------------------------------------------
 * Internal authorization lookup
 *
 * Actions cannot access ctx.db directly, so the
 * action calls this internal query first.
 * --------------------------------------------------
 */

export const getInviteContext =
  internalQuery({
    args: {
      clerkUserId: v.string(),
      siteIds: v.array(
        v.id("sites"),
      ),
    },

    handler: async (ctx, args) => {
      const user = await ctx.db
        .query("users")
        .withIndex(
          "by_clerk_user_id",
          (q) =>
            q.eq(
              "clerkUserId",
              args.clerkUserId,
            ),
        )
        .unique();

      if (!user) {
        throw new Error(
          "User account not found",
        );
      }

      const membership =
        await ctx.db
          .query("companyMembers")
          .withIndex(
            "by_user",
            (q) =>
              q.eq(
                "userId",
                user._id,
              ),
          )
          .first();

      if (
        !membership ||
        membership.status !==
          "ACTIVE" ||
        membership.role !==
          "SUPER_ADMIN"
      ) {
        throw new Error(
          "Only a Super Admin can send invitations",
        );
      }

      /*
       * Security:
       * Every supplied site must actually belong
       * to this Super Admin's company.
       */
      for (const siteId of args.siteIds) {
        const site =
          await ctx.db.get(siteId);

        if (
          !site ||
          site.companyId !==
            membership.companyId
        ) {
          throw new Error(
            "Invalid site selected",
          );
        }
      }

      return {
        userId: user._id,
        companyId:
          membership.companyId,
      };
    },
  });

/*
 * --------------------------------------------------
 * Check duplicate invitation
 * --------------------------------------------------
 */

export const findPending =
  internalQuery({
    args: {
      companyId:
        v.id("companies"),
      email: v.string(),
    },

    handler: async (ctx, args) => {
      const invitation =
        await ctx.db
          .query("invitations")
          .withIndex(
            "by_company_and_email",
            (q) =>
              q
                .eq(
                  "companyId",
                  args.companyId,
                )
                .eq(
                  "email",
                  args.email,
                ),
          )
          .filter((q) =>
            q.eq(
              q.field("status"),
              "PENDING",
            ),
          )
          .first();

      return invitation;
    },
  });

/*
 * --------------------------------------------------
 * Store successful Clerk invitation
 * --------------------------------------------------
 */

export const insertInvitation =
  internalMutation({
    args: {
      companyId:
        v.id("companies"),

      email: v.string(),

      role: invitationRole,

      siteIds: v.array(
        v.id("sites"),
      ),

      clerkInvitationId:
        v.string(),

      createdBy: v.id("users"),
    },

    handler: async (ctx, args) => {
      const now = Date.now();

      return await ctx.db.insert(
        "invitations",
        {
          companyId:
            args.companyId,

          email: args.email,

          role: args.role,

          siteIds: args.siteIds,

          clerkInvitationId:
            args.clerkInvitationId,

          status: "PENDING",

          createdBy:
            args.createdBy,

          createdAt: now,
          updatedAt: now,
        },
      );
    },
  });

/*
 * --------------------------------------------------
 * Public action: send invitation
 * --------------------------------------------------
 */

export const send = action({
  args: {
    email: v.string(),

    role: invitationRole,

    siteIds: v.array(
      v.id("sites"),
    ),
  },

  handler: async (
    ctx,
    args,
  ): Promise<{
    invitationId:
      Id<"invitations">;
  }> => {
    /*
     * Authentication still comes from Clerk.
     */
    const identity =
      await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error(
        "Unauthenticated",
      );
    }

    const email =
      args.email
        .trim()
        .toLowerCase();

    if (!email) {
      throw new Error(
        "Email address is required",
      );
    }

    /*
     * Validate role/site rules.
     */
    if (
      (args.role ===
        "SITE_MANAGER" ||
        args.role ===
          "SUPERVISOR") &&
      args.siteIds.length !== 1
    ) {
      throw new Error(
        "This role must be assigned to exactly one site",
      );
    }

    if (
      args.role ===
        "AREA_MANAGER" &&
      args.siteIds.length === 0
    ) {
      throw new Error(
        "An Area Manager must have at least one site",
      );
    }

    /*
     * Verify the current user really is
     * Super Admin and verify all site IDs.
     */
    const inviteContext =
      await ctx.runQuery(
        internal.invitations
          .getInviteContext,
        {
          clerkUserId:
            identity.subject,

          siteIds:
            args.siteIds,
        },
      );

    /*
     * Prevent duplicate pending invites.
     */
    const existing =
      await ctx.runQuery(
        internal.invitations
          .findPending,
        {
          companyId:
            inviteContext.companyId,

          email,
        },
      );

    if (existing) {
      throw new Error(
        "A pending invitation already exists for this email address",
      );
    }

    const clerkSecretKey =
      process.env.CLERK_SECRET_KEY;

    if (!clerkSecretKey) {
      throw new Error(
        "CLERK_SECRET_KEY is not configured",
      );
    }

    const appUrl =
      process.env.APP_URL;

    if (!appUrl) {
      throw new Error(
        "APP_URL is not configured",
      );
    }

    /*
     * Clerk Application Invitation
     *
     * Metadata will be copied to the Clerk
     * user's publicMetadata when accepted.
     */
    const response = await fetch(
      "https://api.clerk.com/v1/invitations",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${clerkSecretKey}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          email_address: email,

          redirect_url:
            `${appUrl}/accept-invitation`,

          expires_in_days: 7,

          public_metadata: {
            sanitaryLogic: {
              companyId:
                inviteContext.companyId,

              role: args.role,

              siteIds:
                args.siteIds,
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const clerkError =
        await response.text();

      console.error(
        "Clerk invitation failed:",
        clerkError,
      );

      if (response.status === 422) {
        throw new Error(
          "This email may already have an account or invitation",
        );
      }

      if (response.status === 429) {
        throw new Error(
          "Too many invitations have been sent. Please try again later.",
        );
      }

      throw new Error(
        "Unable to send invitation",
      );
    }

    const clerkInvitation =
      (await response.json()) as {
        id: string;
      };

    const invitationId =
      await ctx.runMutation(
        internal.invitations
          .insertInvitation,
        {
          companyId:
            inviteContext.companyId,

          email,

          role: args.role,

          siteIds:
            args.siteIds,

          clerkInvitationId:
            clerkInvitation.id,

          createdBy:
            inviteContext.userId,
        },
      );

    return {
      invitationId,
    };
  },
});

export const acceptFromClerk = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),

    companyId: v.id("companies"),

    role: invitationRole,

    siteIds: v.array(
      v.id("sites"),
    ),
  },

  handler: async (ctx, args) => {
    const email = args.email
      .trim()
      .toLowerCase();

    /*
     * Find the application user created/synced
     * by our Clerk webhook.
     */
    const user = await ctx.db
      .query("users")
      .withIndex(
        "by_clerk_user_id",
        (q) =>
          q.eq(
            "clerkUserId",
            args.clerkUserId,
          ),
      )
      .unique();

    if (!user) {
      throw new Error(
        "Application user not found",
      );
    }

    /*
     * The Convex invitation is our source
     * of truth.
     *
     * Don't trust metadata alone.
     */
    const invitation = await ctx.db
      .query("invitations")
      .withIndex(
        "by_company_and_email",
        (q) =>
          q
            .eq(
              "companyId",
              args.companyId,
            )
            .eq("email", email),
      )
      .filter((q) =>
        q.eq(
          q.field("status"),
          "PENDING",
        ),
      )
      .first();

    if (!invitation) {
      throw new Error(
        "Pending invitation not found",
      );
    }

    /*
     * Verify that Clerk metadata still matches
     * our actual Convex invitation.
     */
    if (
      invitation.role !==
      args.role
    ) {
      throw new Error(
        "Invitation role mismatch",
      );
    }

    const invitationSiteIds =
      [...invitation.siteIds]
        .map(String)
        .sort();

    const metadataSiteIds =
      [...args.siteIds]
        .map(String)
        .sort();

    if (
      JSON.stringify(
        invitationSiteIds,
      ) !==
      JSON.stringify(
        metadataSiteIds,
      )
    ) {
      throw new Error(
        "Invitation site access mismatch",
      );
    }

    /*
     * Validate company.
     */
    const company = await ctx.db.get(
      invitation.companyId,
    );

    if (!company) {
      throw new Error(
        "Invited company not found",
      );
    }

    if (
      company.status !== "ACTIVE"
    ) {
      throw new Error(
        "Company is inactive",
      );
    }

    /*
     * Prevent someone already belonging to another
     * company from accidentally joining this one.
     *
     * We're currently using one company per user.
     */
    const existingMembership =
      await ctx.db
        .query("companyMembers")
        .withIndex("by_user", (q) =>
          q.eq(
            "userId",
            user._id,
          ),
        )
        .first();

    if (
      existingMembership &&
      existingMembership.companyId !==
        invitation.companyId
    ) {
      throw new Error(
        "User already belongs to another company",
      );
    }

    const now = Date.now();

    /*
     * Create company membership if necessary.
     */
    if (!existingMembership) {
      await ctx.db.insert(
        "companyMembers",
        {
          companyId:
            invitation.companyId,

          userId: user._id,

          role: invitation.role,

          status: "ACTIVE",

          createdAt: now,
          updatedAt: now,
        },
      );
    } else {
      /*
       * Makes this mutation idempotent.
       *
       * If the webhook is retried we don't create
       * a duplicate membership.
       */
      await ctx.db.patch(
        existingMembership._id,
        {
          role: invitation.role,
          status: "ACTIVE",
          updatedAt: now,
        },
      );
    }

    /*
     * Create the site assignments.
     */
    for (
      const siteId of
      invitation.siteIds
    ) {
      const site =
        await ctx.db.get(siteId);

      if (
        !site ||
        site.companyId !==
          invitation.companyId
      ) {
        throw new Error(
          "Invitation contains an invalid site",
        );
      }

      const existingAssignment =
        await ctx.db
          .query(
            "siteAssignments",
          )
          .withIndex(
            "by_user_and_site",
            (q) =>
              q
                .eq(
                  "userId",
                  user._id,
                )
                .eq(
                  "siteId",
                  siteId,
                ),
          )
          .unique();

      if (existingAssignment) {
        await ctx.db.patch(
          existingAssignment._id,
          {
            companyId:
              invitation.companyId,

            role:
              invitation.role,

            status: "ACTIVE",

            updatedAt: now,
          },
        );
      } else {
        await ctx.db.insert(
          "siteAssignments",
          {
            companyId:
              invitation.companyId,

            siteId,

            userId:
              user._id,

            role:
              invitation.role,

            status: "ACTIVE",

            createdAt: now,
            updatedAt: now,
          },
        );
      }
    }

    /*
     * Finally consume the invitation.
     */
    await ctx.db.patch(
      invitation._id,
      {
        status: "ACCEPTED",
        updatedAt: now,
      },
    );

    return {
      userId: user._id,
      companyId:
        invitation.companyId,
      role: invitation.role,
    };
  },
});