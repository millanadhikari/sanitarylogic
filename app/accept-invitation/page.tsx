"use client";

import {
  FormEvent,
  ReactNode,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useClerk,
  useSignUp,
  useUser,
} from "@clerk/nextjs";

import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
} from "lucide-react";

import { toast } from "sonner";

import {
  AuthCard,
  AuthShell,
} from "@/components/auth/AuthShell";

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clerk = useClerk();

  const {
    isLoaded: isUserLoaded,
    isSignedIn,
  } = useUser();

  const {
    signUp,
    errors,
    fetchStatus,
  } = useSignUp();

  /*
   * Clerk adds this to the URL when the
   * recipient clicks the invitation email.
   */
  const ticket = searchParams.get(
    "__clerk_ticket",
  );

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  /*
   * This is important.
   *
   * Once the invitation form starts processing,
   * we don't want isSignedIn becoming true to
   * trigger the "already signed in" screen.
   */
  const [
    acceptingInvitation,
    setAcceptingInvitation,
  ] = useState(false);

  const [
    invitationAccepted,
    setInvitationAccepted,
  ] = useState(false);

  const isLoading =
    fetchStatus === "fetching" ||
    acceptingInvitation;

  async function handleAccept(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    console.log(
      "ACCEPT INVITATION CLICKED",
    );

    if (!ticket) {
      setError(
        "This invitation link is invalid or has expired.",
      );

      return;
    }

    if (!firstName.trim()) {
      setError(
        "First name is required.",
      );

      return;
    }

    if (!lastName.trim()) {
      setError(
        "Last name is required.",
      );

      return;
    }

    if (!password) {
      setError(
        "Password is required.",
      );

      return;
    }

    if (
      password !== confirmPassword
    ) {
      setError(
        "Passwords do not match.",
      );

      return;
    }

    try {
      setError("");

      /*
       * Set this BEFORE calling Clerk.
       *
       * Clerk may update isSignedIn during the
       * flow. We don't want our signed-in guard
       * to take over the page at that point.
       */
      setAcceptingInvitation(true);

      console.log(
        "Creating invited Clerk account...",
      );

      const {
        error: signUpError,
      } = await signUp.create({
        strategy: "ticket",

        ticket,

        firstName:
          firstName.trim(),

        lastName:
          lastName.trim(),

        password,
      });

      if (signUpError) {
        console.error(
          "Clerk invitation signup error:",
          signUpError,
        );

        setAcceptingInvitation(
          false,
        );

        setError(
          signUpError.message ??
            "Unable to accept invitation.",
        );

        return;
      }

      console.log(
        "Invitation signup state:",
        {
          status: signUp.status,
          requiredFields:
            signUp.requiredFields,
          missingFields:
            signUp.missingFields,
        },
      );

      /*
       * For our password + invitation flow,
       * signup should now be complete.
       */
      if (
        signUp.status !== "complete"
      ) {
        setAcceptingInvitation(
          false,
        );

        console.error(
          "Invitation signup incomplete:",
          {
            status:
              signUp.status,

            requiredFields:
              signUp.requiredFields,

            missingFields:
              signUp.missingFields,
          },
        );

        setError(
          signUp.missingFields.length >
            0
            ? `Additional information is required: ${signUp.missingFields.join(
                ", ",
              )}`
            : "Your account could not be completed.",
        );

        return;
      }

      /*
       * From this point onward the invitation
       * signup itself succeeded.
       */
      setInvitationAccepted(true);

      console.log(
        "Invitation accepted. Finalizing session...",
      );

      const {
        error: finalizeError,
      } = await signUp.finalize({
        navigate: ({
          session,
          decorateUrl,
        }) => {
          console.log(
            "Clerk session finalized:",
            {
              sessionId:
                session?.id,

              currentTask:
                session?.currentTask,
            },
          );

          /*
           * If Clerk requires another session
           * task, don't blindly redirect.
           */
          if (
            session?.currentTask
          ) {
            console.log(
              "Clerk requires session task:",
              session.currentTask,
            );

            return;
          }

          /*
           * Send everything through our central
           * Sanitary Logic auth router.
           *
           * Convex webhook will have created:
           *
           * users
           * companyMembers
           * siteAssignments
           *
           * auth/redirect then reads getMyContext().
           */
          const redirectUrl =
            decorateUrl(
              "/auth/redirect",
            );

          console.log(
            "Redirecting invited user:",
            redirectUrl,
          );

          if (
            redirectUrl.startsWith(
              "http",
            )
          ) {
            window.location.href =
              redirectUrl;

            return;
          }

          router.replace(
            redirectUrl,
          );
        },
      });

      if (finalizeError) {
        console.error(
          "Clerk finalize error:",
          finalizeError,
        );

        setInvitationAccepted(
          false,
        );

        setAcceptingInvitation(
          false,
        );

        setError(
          finalizeError.message ??
            "Your account was created, but we could not start your session.",
        );

        return;
      }

      toast.success(
        "Invitation accepted.",
      );
    } catch (err) {
      console.error(
        "Invitation acceptance failed:",
        err,
      );

      setInvitationAccepted(
        false,
      );

      setAcceptingInvitation(
        false,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to accept invitation.",
      );
    }
  }

  /*
   * ------------------------------------------------
   * Clerk loading
   * ------------------------------------------------
   */

  if (!isUserLoaded) {
    return (
      <InvitationLoading
        message="Loading invitation..."
      />
    );
  }

  /*
   * ------------------------------------------------
   * Invalid URL
   * ------------------------------------------------
   */

  if (!ticket) {
    return (
      <InvalidInvitation />
    );
  }

  /*
   * ------------------------------------------------
   * Existing signed-in user
   * ------------------------------------------------
   *
   * Example:
   *
   * Super Admin sends invitation,
   * then clicks that invitation from the same
   * browser where they're still logged in.
   *
   * They must sign out first.
   *
   * IMPORTANT:
   * Do NOT show this once invitation acceptance
   * has started. Clerk may set isSignedIn=true
   * while creating the invited user's session.
   */
  if (
    isSignedIn &&
    !acceptingInvitation &&
    !invitationAccepted
  ) {
    return (
      <SignedInInvitation
        onSignOut={async () => {
          /*
           * Preserve the COMPLETE invitation URL,
           * including __clerk_ticket.
           */
          const returnUrl =
            window.location.href;

          await clerk.signOut({
            redirectUrl:
              returnUrl,
          });
        }}
      />
    );
  }

  /*
   * ------------------------------------------------
   * Successful signup / redirect transition
   * ------------------------------------------------
   */

  if (invitationAccepted) {
    return (
      <InvitationLoading
        message="Setting up your workspace..."
        description="Your account has been created. We're loading your company and assigned sites."
      />
    );
  }

  /*
   * ------------------------------------------------
   * Invitation form
   * ------------------------------------------------
   */

  return (
    <AuthShell
      showHeader={false}
    >
      <AuthCard>
        <div className="text-center">
          <p className="label-caps text-primary">
            Team Invitation
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Join Your Team
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            You&apos;ve been invited
            to join Sanitary Logic.
            Complete your account to
            access your workspace.
          </p>
        </div>

        <form
          onSubmit={handleAccept}
          className="mt-8 space-y-5"
        >
          {/* Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="firstName"
              label="First Name"
              value={firstName}
              onChange={
                setFirstName
              }
              placeholder="Sarah"
              autoComplete="given-name"
            />

            <TextField
              id="lastName"
              label="Last Name"
              value={lastName}
              onChange={
                setLastName
              }
              placeholder="Jenkins"
              autoComplete="family-name"
            />
          </div>

          {/* Password */}
          <PasswordField
            id="password"
            label="Create Password"
            value={password}
            onChange={
              setPassword
            }
            show={
              showPassword
            }
            onToggle={() =>
              setShowPassword(
                (current) =>
                  !current,
              )
            }
          />

          <PasswordField
            id="confirmPassword"
            label="Confirm Password"
            value={
              confirmPassword
            }
            onChange={
              setConfirmPassword
            }
            show={
              showPassword
            }
            onToggle={() =>
              setShowPassword(
                (current) =>
                  !current,
              )
            }
          />

          {/* Clerk field errors */}
          {errors.fields
            .firstName && (
            <ErrorText>
              {
                errors.fields
                  .firstName
                  .message
              }
            </ErrorText>
          )}

          {errors.fields
            .lastName && (
            <ErrorText>
              {
                errors.fields
                  .lastName
                  .message
              }
            </ErrorText>
          )}

          {/* Our error */}
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
              <p className="text-sm leading-5 text-destructive">
                {error}
              </p>
            </div>
          )}

          {/*
           * Required when Clerk bot protection /
           * Smart CAPTCHA is enabled.
           */}
          <div
            id="clerk-captcha"
            data-cl-theme="auto"
            data-cl-size="flexible"
          />

          <button
            type="submit"
            disabled={
              isLoading ||
              !firstName.trim() ||
              !lastName.trim() ||
              !password ||
              !confirmPassword
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />

                Creating Account...
              </>
            ) : (
              <>
                Accept Invitation

                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
          Your invitation verifies
          the email address that was
          invited to Sanitary Logic.
        </p>
      </AuthCard>
    </AuthShell>
  );
}

/*
 * ==================================================
 * TEXT FIELD
 * ==================================================
 */

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;

  onChange: (
    value: string,
  ) => void;

  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="label-mono block"
      >
        {label}
      </label>

      <div className="relative">
        <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <input
          id={id}
          type="text"
          value={value}
          autoComplete={
            autoComplete
          }
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          placeholder={
            placeholder
          }
          className="h-12 w-full rounded-md border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
        />
      </div>
    </div>
  );
}

/*
 * ==================================================
 * PASSWORD FIELD
 * ==================================================
 */

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;

  onChange: (
    value: string,
  ) => void;

  show: boolean;

  onToggle: () => void;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="label-mono block"
      >
        {label}
      </label>

      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <input
          id={id}
          type={
            show
              ? "text"
              : "password"
          }
          value={value}
          autoComplete="new-password"
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          placeholder="••••••••"
          className="h-12 w-full rounded-md border border-border bg-card pl-10 pr-11 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
        />

        <button
          type="button"
          onClick={
            onToggle
          }
          aria-label={
            show
              ? "Hide password"
              : "Show password"
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}

/*
 * ==================================================
 * EXISTING SESSION
 * ==================================================
 */

function SignedInInvitation({
  onSignOut,
}: {
  onSignOut:
    () => Promise<void>;
}) {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSignOut() {
    try {
      setLoading(true);
      setError("");

      await onSignOut();
    } catch (err) {
      console.error(
        "Invitation sign-out failed:",
        err,
      );

      setLoading(false);

      setError(
        "Unable to sign out. Please try again.",
      );
    }
  }

  return (
    <AuthShell
      showHeader={false}
    >
      <AuthCard>
        <div className="text-center">
          <p className="label-caps text-primary">
            Team Invitation
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
            Sign out to continue
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            You&apos;re currently
            signed in to another
            Sanitary Logic account.
            Sign out before accepting
            this invitation.
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
              <p className="text-sm text-destructive">
                {error}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={
              handleSignOut
            }
            className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />

                Signing Out...
              </>
            ) : (
              <>
                Sign Out & Continue

                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </AuthCard>
    </AuthShell>
  );
}

/*
 * ==================================================
 * LOADING / WORKSPACE SETUP
 * ==================================================
 */

function InvitationLoading({
  message,
  description,
}: {
  message: string;
  description?: string;
}) {
  return (
    <AuthShell
      showHeader={false}
    >
      <AuthCard>
        <div className="py-10 text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-primary" />

          <h1 className="mt-5 text-xl font-bold tracking-tight text-foreground">
            {message}
          </h1>

          {description && (
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </AuthCard>
    </AuthShell>
  );
}

/*
 * ==================================================
 * INVALID INVITATION
 * ==================================================
 */

function InvalidInvitation() {
  return (
    <AuthShell
      showHeader={false}
    >
      <AuthCard>
        <div className="text-center">
          <p className="label-caps text-destructive">
            Invitation Error
          </p>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            Invalid Invitation
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            This invitation link
            is missing, invalid,
            or may have expired.
          </p>

          <Link
            href="/sign-in"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Go to Sign In

            <ArrowRight className="size-4" />
          </Link>
        </div>
      </AuthCard>
    </AuthShell>
  );
}

/*
 * ==================================================
 * ERROR TEXT
 * ==================================================
 */

function ErrorText({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="text-sm text-destructive">
      {children}
    </p>
  );
}