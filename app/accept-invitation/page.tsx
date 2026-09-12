import { Suspense } from "react";

import AcceptInvitationClient from "./accept-invitation-client";

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<InvitationPageLoading />}>
      <AcceptInvitationClient />
    </Suspense>
  );
}

function InvitationPageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <p className="text-sm text-muted-foreground">Loading invitation...</p>
    </main>
  );
}
