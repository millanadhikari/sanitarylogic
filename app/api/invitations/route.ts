import { NextResponse } from "next/server";
import { clerkClient, auth } from "@clerk/nextjs/server";

export async function POST(
  request: Request,
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const {
      email,
      companyId,
      siteId,
      role,
      invitationId,
    } = body;

    if (
      !email ||
      !companyId ||
      !role ||
      !invitationId
    ) {
      return NextResponse.json(
        {
          error:
            "email, companyId, role and invitationId are required",
        },
        { status: 400 },
      );
    }

    const client = await clerkClient();

    const invitation =
      await client.invitations.createInvitation({
        emailAddress: email,

        redirectUrl:
          `${process.env.NEXT_PUBLIC_APP_URL}` +
          `/accept-invitation`,

        publicMetadata: {
          companyId,
          siteId: siteId ?? null,
          role,
          invitationId,
        },

        expiresInDays: 30,
      });

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
    });
  } catch (error) {
    console.error(
      "Create invitation error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create invitation",
      },
      { status: 500 },
    );
  }
}