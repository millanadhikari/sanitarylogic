"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useConvexAuth,
  useQuery,
} from "convex/react";
import { Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";

export default function AuthRedirectClient() {
  const router = useRouter();

  const {
    isAuthenticated,
    isLoading: convexAuthLoading,
  } = useConvexAuth();

  /*
   * Unlike getMyCompany(), this query does not
   * throw if the Clerk webhook has not synced
   * the user into Convex yet.
   */
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );

  /*
   * Only ask Convex for the company once the
   * application user definitely exists.
   */
  const companyData = useQuery(
    api.companies.getMyCompany,
    isAuthenticated && currentUser
      ? {}
      : "skip",
  );

  const [waitingTooLong, setWaitingTooLong] =
    useState(false);

  /*
   * The webhook should normally sync very
   * quickly.
   *
   * If it hasn't happened after 10 seconds,
   * show the user a useful message instead
   * of spinning forever.
   */
  useEffect(() => {
    if (
      !isAuthenticated ||
      currentUser
    ) {
      setWaitingTooLong(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setWaitingTooLong(true);
    }, 10_000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    isAuthenticated,
    currentUser,
  ]);

  /*
   * Redirect once we have enough information.
   */
  useEffect(() => {
    if (
      convexAuthLoading ||
      !isAuthenticated
    ) {
      return;
    }

    /*
     * undefined = query loading
     * null      = webhook hasn't synced yet
     */
    if (
      currentUser === undefined ||
      currentUser === null
    ) {
      return;
    }

    if (companyData === undefined) {
      return;
    }

    /*
     * User exists but doesn't belong
     * to a company yet.
     */
    if (companyData === null) {
      router.replace("/onboarding");
      return;
    }

    /*
     * User + company membership exist.
     */
    router.replace("/dashboard");
  }, [
    convexAuthLoading,
    isAuthenticated,
    currentUser,
    companyData,
    router,
  ]);

  if (waitingTooLong) {
    return (
      <main className="grid-canvas flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <h1 className="text-xl font-bold text-foreground">
            We&apos;re setting up your account
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your account was authenticated,
            but your workspace is still being
            prepared.
          </p>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This normally only takes a few
            seconds.
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-6 h-11 rounded-md bg-primary px-5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="grid-canvas flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />

        <p className="mt-4 text-sm font-medium text-foreground">
          Preparing your workspace
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          This will only take a moment.
        </p>
      </div>
    </main>
  );
}