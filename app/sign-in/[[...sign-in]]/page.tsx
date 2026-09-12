"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";
import {
  ArrowRight,
  Brush,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";

import {
  AuthCard,
  AuthShell,
} from "@/components/auth/AuthShell";

export default function SignInPage() {
  const router = useRouter();

  const {
    signIn,
    errors,
    fetchStatus,
  } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [error, setError] = useState("");

  const isLoading =
    fetchStatus === "fetching";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    try {
      setError("");

      const { error } =
        await signIn.password({
          emailAddress: email.trim(),
          password,
        });

      if (error) {
        console.error(
          "Clerk sign-in error:",
          error,
        );

        setError(
          error.message ??
            "Unable to sign in.",
        );

        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({
            session,
            decorateUrl,
          }) => {
            /*
             * Clerk may require a session task
             * before allowing normal navigation.
             */
            if (session?.currentTask) {
              console.log(
                "Clerk session task:",
                session.currentTask,
              );

              return;
            }

            const url = decorateUrl(
              "/auth/redirect",
            );

            if (url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.push(url);
            }
          },
        });

        return;
      }

      if (
        signIn.status ===
        "needs_second_factor"
      ) {
        setError(
          "Your account requires additional verification.",
        );

        return;
      }

      if (
        signIn.status ===
        "needs_client_trust"
      ) {
        setError(
          "Your account requires device verification.",
        );

        return;
      }

      console.log(
        "Unexpected sign-in status:",
        signIn.status,
      );

      setError(
        "Sign in could not be completed.",
      );
    } catch (error) {
      console.error(
        "Sign in failed:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <AuthShell showHeader={false}>
      <AuthCard>
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <Brush className="h-6 w-6 text-primary" />

          <span className="text-2xl font-bold tracking-tight text-foreground">
            Sanitary Logic
          </span>
        </div>

        {/* Heading */}
        <h1 className="mt-8 text-center text-4xl font-bold tracking-tight text-foreground">
          Welcome Back
        </h1>

        <p className="mt-2 text-center text-muted-foreground">
          Sign in to manage your precision
          operations.
        </p>

        {/* Form */}
        <form
          className="mt-8 space-y-5"
          onSubmit={handleSubmit}
        >
          {/* Email */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="label-mono block"
            >
              Email address
            </label>

            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(
                    event.target.value,
                  );

                  if (error) {
                    setError("");
                  }
                }}
                placeholder="admin@example.com"
                disabled={isLoading}
                className="h-12 w-full rounded-md border border-border bg-card pl-10 pr-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {errors.fields.identifier && (
              <p className="text-sm text-red-600">
                {
                  errors.fields.identifier
                    .message
                }
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="password"
                className="label-mono block"
              >
                Password
              </label>

              <Link
                href="/forgot-password"
                className="font-mono text-xs tracking-wide text-primary hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(
                    event.target.value,
                  );

                  if (error) {
                    setError("");
                  }
                }}
                placeholder="••••••••"
                disabled={isLoading}
                className="h-12 w-full rounded-md border border-border bg-card pl-10 pr-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {errors.fields.password && (
              <p className="text-sm text-red-600">
                {
                  errors.fields.password
                    .message
                }
              </p>
            )}
          </div>

          {/* General Error */}
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3"
            >
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={
              isLoading ||
              !email.trim() ||
              !password
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-8 flex items-center gap-4">
          <span className="h-px flex-1 bg-border" />

          <span className="font-mono text-xs tracking-widest text-muted-foreground">
            OR
          </span>

          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Sign Up */}
        <p className="mt-6 text-center text-sm text-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}