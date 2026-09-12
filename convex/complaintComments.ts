import { v } from "convex/values";

import {
  mutation,
  query,
} from "./_generated/server";

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

      await requireTenancyAccess(
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
          .collect();

      const activeComments =
        comments
          .filter(
            (comment) =>
              !comment.deletedAt,
          )
          .sort(
            (a, b) =>
              a.createdAt -
              b.createdAt,
          );

      return await Promise.all(
        activeComments.map(
          async (comment) => {
            const user =
              await ctx.db.get(
                comment.createdBy,
              );

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
            };
          },
        ),
      );
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
    },
  });