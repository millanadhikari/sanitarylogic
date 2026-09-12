import { internalMutation, query } from "./_generated/server";

import { v } from "convex/values";

import { requireUser } from "./lib/authorization";

const clerkUserValidator = v.object({
  id: v.string(),

  first_name: v.union(v.string(), v.null()),

  last_name: v.union(v.string(), v.null()),

  image_url: v.union(v.string(), v.null()),

  email_addresses: v.array(
    v.object({
      email_address: v.string(),
    }),
  ),
});
export const upsertFromClerk = internalMutation({
  args: {
    clerkUserId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId),
      )
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        updatedAt: now,
      });

      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  },
});
export const deleteFromClerk = internalMutation({
  args: {
    clerkUserId: v.string(),
  },

  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId),
      )
      .unique();

    if (!user) {
      console.warn(
        `No Convex user found for deleted Clerk user ${args.clerkUserId}`,
      );

      return;
    }

    /*
     * IMPORTANT:
     *
     * We don't immediately delete the user.
     *
     * Later we'll have company memberships,
     * site assignments, worker profiles,
     * activity history, etc.
     *
     * Deleting the user could break historical
     * records.
     *
     * For now, mark them inactive.
     */

    await ctx.db.patch(user._id, {
      status: "INACTIVE",
      updatedAt: Date.now(),
    });
  },
});
export const getCurrentUser = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
  },
});

export const getMyContext = query({
  args: {},

  handler: async (ctx) => {
    const identity =
      await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
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
      return null;
    }

    if (user.status !== "ACTIVE") {
      throw new Error(
        "User account is inactive",
      );
    }

    /*
     * Company membership tells us:
     *
     * "This person belongs to this company"
     * and their primary application role.
     */
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
      return {
        user: {
          _id: user._id,
          clerkUserId: user.clerkUserId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },

        company: null,
        companyMembership: null,
        siteAssignments: [],
        primaryRole: null,
      };
    }

    const company = await ctx.db.get(
      membership.companyId,
    );

    if (!company) {
      throw new Error(
        "Company not found",
      );
    }

    /*
     * Site assignments tell us:
     *
     * "Which sites can this employee access?"
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

    const siteAssignments = (
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
              assignmentId:
                assignment._id,

              siteId: site._id,
              siteName: site.name,
              siteCode: site.code,

              companyId:
                assignment.companyId,

              role: assignment.role,
            };
          },
        ),
      )
    ).filter(
      (
        assignment,
      ): assignment is NonNullable<
        typeof assignment
      > => assignment !== null,
    );

    return {
      user: {
        _id: user._id,
        clerkUserId: user.clerkUserId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },

      company: {
        _id: company._id,
        name: company.name,
        status: company.status,
      },

      companyMembership: {
        _id: membership._id,
        role: membership.role,
        status: membership.status,
      },

      siteAssignments,

      /*
       * Primary dashboard/sidebar role now has
       * one authoritative source.
       */
      primaryRole: membership.role,
    };
  },
});
export const getCurrentUserOrThrow = query({
  args: {},

  handler: async (ctx) => {
    return await requireUser(ctx);
  },
});
