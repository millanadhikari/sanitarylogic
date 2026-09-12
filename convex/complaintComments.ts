import { v } from "convex/values";

import {
  mutation,
  query,
} from "./_generated/server";

import schema from "./schema";

import {
  requireTenancyAccess,
  requireUser,
} from "./lib/authorization";

export const getByComplaint =
  query({
    args: {
      complaintId:
        v.id(
          "tenancyComplaints",
        ),
    },
    returns: v.array(
      schema.doc("complaintComments").extend({
        author: v.union(
          v.null(),
          v.object({
            _id: v.id("users"),
            firstName: v.optional(v.string()),
            lastName: v.optional(v.string()),
            email: v.optional(v.string()),
          }),
        ),
        canDelete: v.boolean(),
      }),
    ),

    handler: async (
      ctx,
      args,
    ) => {
      const complaint =
        await ctx.db.get(
          args.complaintId,
        );

      if (
        !complaint ||
        complaint.deletedAt
      ) {
        throw new Error(
          "Complaint not found",
        );
      }

      const access = await requireTenancyAccess(
        ctx,
        complaint.tenancyId,
      );

      const comments =
        await ctx.db
          .query(
            "complaintComments",
          )
          .withIndex(
            "by_complaint",
            (q) =>
              q.eq(
                "complaintId",
                args.complaintId,
              ),
          )
          .order("asc")
          .take(200);

      const activeComments =
        comments
          .filter(
            (comment) =>
              !comment.deletedAt,
          );

      const userIds = [
        ...new Set(
          activeComments.map((comment) => comment.createdBy),
        ),
      ];

      const users = await Promise.all(
        userIds.map((userId) => ctx.db.get(userId)),
      );

      const usersById = new Map(
        users
          .filter((user) => user !== null)
          .map((user) => [user._id, user]),
      );

      const canModerate =
        access.role === "SUPER_ADMIN" ||
        access.role === "AREA_MANAGER" ||
        access.role === "SITE_MANAGER";

      return activeComments.map((comment) => {
        const user = usersById.get(comment.createdBy);

        return {
          ...comment,

          author: user
            ? {
                _id:
                  user._id,

                firstName:
                  user.firstName,

                lastName:
                  user.lastName,

                email:
                  user.email,
              }
            : null,
          canDelete:
            canModerate || comment.createdBy === access.user._id,
        };
      });
    },
  });

export const create =
  mutation({
    args: {
      complaintId:
        v.id(
          "tenancyComplaints",
        ),

      content:
        v.string(),
    },
    returns: v.id("complaintComments"),

    handler: async (
      ctx,
      args,
    ) => {
      const user =
        await requireUser(ctx);

      const complaint =
        await ctx.db.get(
          args.complaintId,
        );

      if (
        !complaint ||
        complaint.deletedAt
      ) {
        throw new Error(
          "Complaint not found",
        );
      }

      await requireTenancyAccess(
        ctx,
        complaint.tenancyId,
      );

      const content =
        args.content.trim();

      if (!content) {
        throw new Error(
          "Comment cannot be empty",
        );
      }

      const now =
        Date.now();

      return await ctx.db.insert(
        "complaintComments",
        {
          companyId:
            complaint.companyId,

          siteId:
            complaint.siteId,

          tenancyId:
            complaint.tenancyId,

          complaintId:
            complaint._id,

          createdBy:
            user._id,

          content,

          createdAt: now,
          updatedAt: now,
        },
      );
    },
  });

export const remove =
  mutation({
    args: {
      commentId:
        v.id(
          "complaintComments",
        ),
    },
    returns: v.null(),

    handler: async (
      ctx,
      args,
    ) => {
      const user =
        await requireUser(ctx);

      const comment =
        await ctx.db.get(
          args.commentId,
        );

      if (
        !comment ||
        comment.deletedAt
      ) {
        throw new Error(
          "Comment not found",
        );
      }

      const access =
        await requireTenancyAccess(
          ctx,
          comment.tenancyId,
        );

      const isAuthor =
        comment.createdBy ===
        user._id;

      const isManager =
        access.role ===
          "SUPER_ADMIN" ||
        access.role ===
          "AREA_MANAGER" ||
        access.role ===
          "SITE_MANAGER";

      if (
        !isAuthor &&
        !isManager
      ) {
        throw new Error(
          "You do not have permission to delete this comment",
        );
      }

      await ctx.db.patch(
        comment._id,
        {
          deletedAt:
            Date.now(),

          updatedAt:
            Date.now(),
        },
      );

      return null;
    },
  });
