import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

import { Webhook } from "svix";

import type { WebhookEvent } from "@clerk/backend";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",

  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);

    if (!event) {
      return new Response("Error occurred", {
        status: 400,
      });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const primaryEmailId = event.data.primary_email_address_id;

        const emailObject =
          event.data.email_addresses.find(
            (email) => email.id === primaryEmailId,
          ) ?? event.data.email_addresses[0];

        const email = emailObject?.email_address;

        /*
         * First make sure the application user exists.
         */
        await ctx.runMutation(internal.users.upsertFromClerk, {
          clerkUserId: event.data.id,

          firstName: event.data.first_name ?? undefined,

          lastName: event.data.last_name ?? undefined,

          imageUrl: event.data.image_url ?? undefined,

          email,
        });

        /*
         * ------------------------------------------------
         * INVITATION HANDLING
         * ------------------------------------------------
         *
         * Clerk copies the invitation's publicMetadata
         * onto the User after the invitation is accepted.
         */
        const publicMetadata = event.data.public_metadata as {
          sanitaryLogic?: {
            companyId?: string;

            role?: "AREA_MANAGER" | "SITE_MANAGER" | "SUPERVISOR" | "CLEANER";

            siteIds?: string[];
          };
        };

        const inviteMetadata = publicMetadata?.sanitaryLogic;

        if (
          email &&
          inviteMetadata?.companyId &&
          inviteMetadata.role &&
          Array.isArray(inviteMetadata.siteIds)
        ) {
          try {
            await ctx.runMutation(internal.invitations.acceptFromClerk, {
              clerkUserId: event.data.id,

              email,

              companyId: inviteMetadata.companyId as any,

              role: inviteMetadata.role,

              siteIds: inviteMetadata.siteIds as any,
            });
          } catch (error) {
            console.error(
              "Failed to process Sanitary Logic invitation:",
              error,
            );

            /*
             * IMPORTANT:
             *
             * Throw here so Clerk receives a non-2xx
             * response and retries the webhook.
             *
             * We don't want the user sync to appear
             * successful while membership creation failed.
             */
            throw error;
          }
        }

        break;
      }

      case "user.deleted": {
        const clerkUserId = event.data.id;

        if (!clerkUserId) {
          return new Response("Missing Clerk user ID", {
            status: 400,
          });
        }

        await ctx.runMutation(internal.users.deleteFromClerk, {
          clerkUserId,
        });

        break;
      }

      default:
        console.log("Ignored Clerk webhook event:", event.type);
    }

    return new Response("Webhook processed", {
      status: 200,
    });
  }),
});

async function validateRequest(request: Request): Promise<WebhookEvent | null> {
  const payload = await request.text();

  const svixHeaders = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!secret) {
    console.error("CLERK_WEBHOOK_SIGNING_SECRET is missing");

    return null;
  }

  try {
    const webhook = new Webhook(secret);

    return webhook.verify(payload, svixHeaders) as WebhookEvent;
  } catch (error) {
    console.error("Clerk webhook verification failed:", error);

    return null;
  }
}

export default http;
