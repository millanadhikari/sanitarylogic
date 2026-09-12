"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  AuthCard,
  AuthShell,
} from "@/components/auth/AuthShell";

type Step = "email" | "code" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const {
    signIn,
    errors,
    fetchStatus,
  } = useSignIn();

  const [step, setStep] =
    useState<Step>("email");

  const [email, setEmail] =
    useState("");

  const [code, setCode] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const isLoading =
    fetchStatus === "fetching";

  /*
   * STEP 1
   * Create a sign-in attempt and ask Clerk
   * to send the password-reset code.
   */
  async function handleSendCode(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    try {
      setError("");

      const { error: createError } =
        await signIn.create({
          identifier: email.trim(),
        });

      if (createError) {
        setError(
          createError.message ??
            "Unable to find that account.",
        );

        return;
      }

      const { error: sendCodeError } =
        await signIn.resetPasswordEmailCode.sendCode();

      if (sendCodeError) {
        setError(
          sendCodeError.message ??
            "Unable to send reset code.",
        );

        return;
      }

      setStep("code");

      toast.success(
        "Password reset code sent.",
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to send reset code.",
      );
    }
  }

  /*
   * STEP 2
   * Verify the code sent by Clerk.
   */
  async function handleVerifyCode(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!code.trim()) {
      setError(
        "Enter the verification code.",
      );
      return;
    }

    try {
      setError("");

      const { error: verifyError } =
        await signIn.resetPasswordEmailCode.verifyCode({
          code: code.trim(),
        });

      if (verifyError) {
        setError(
          verifyError.message ??
            "Invalid verification code.",
        );

        return;
      }

      if (
        signIn.status ===
        "needs_new_password"
      ) {
        setStep("password");
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify code.",
      );
    }
  }

  /*
   * STEP 3
   * Set the new password.
   */
  async function handleResetPassword(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!password) {
      setError(
        "New password is required.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match.",
      );
      return;
    }

    try {
      setError("");

      const { error: passwordError } =
        await signIn.resetPasswordEmailCode.submitPassword({
          password,

          // Good security default.
          signOutOfOtherSessions: true,
        });

      if (passwordError) {
        setError(
          passwordError.message ??
            "Unable to reset password.",
        );

        return;
      }

      if (signIn.status === "complete") {
        toast.success(
          "Your password has been updated.",
        );

        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl(
              "/auth/redirect",
            );

            if (url.startsWith("http")) {
              window.location.href = url;
              return;
            }

            router.replace(url);
          },
        });
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to reset password.",
      );
    }
  }

  return (
    <AuthShell
      showHeader={false}
      showFooter={false}
    >
      <div className="w-full max-w-md">
        {/* Brand */}
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-foreground">
          Sanitary Logic
        </h2>

        <AuthCard>
          {step === "email" && (
            <EmailStep
              email={email}
              setEmail={setEmail}
              error={error}
              loading={isLoading}
              onSubmit={handleSendCode}
            />
          )}

          {step === "code" && (
            <CodeStep
              email={email}
              code={code}
              setCode={setCode}
              error={error}
              loading={isLoading}
              onSubmit={handleVerifyCode}
              onBack={() => {
                setError("");
                setCode("");
                signIn.reset();
                setStep("email");
              }}
            />
          )}

          {step === "password" && (
            <PasswordStep
              password={password}
              setPassword={setPassword}
              confirmPassword={
                confirmPassword
              }
              setConfirmPassword={
                setConfirmPassword
              }
              showPassword={showPassword}
              setShowPassword={
                setShowPassword
              }
              error={error}
              loading={isLoading}
              onSubmit={
                handleResetPassword
              }
            />
          )}
        </AuthCard>
      </div>
    </AuthShell>
  );
}

function EmailStep({
  email,
  setEmail,
  error,
  loading,
  onSubmit,
}: {
  email: string;
  setEmail: (value: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
}) {
  return (
    <>
      <h1 className="text-center text-4xl font-bold tracking-tight text-foreground">
        Forgot Password?
      </h1>

      <p className="mx-auto mt-3 max-w-sm text-center text-muted-foreground">
        Enter your email address and
        we&apos;ll send you a verification
        code to reset your password.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={onSubmit}
      >
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
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="name@company.com"
              disabled={loading}
              autoFocus
              className="h-12 w-full rounded-md border border-border bg-card pl-10 pr-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-60"
            />
          </div>
        </div>

        <ErrorMessage error={error} />

        <button
          type="submit"
          disabled={
            loading || !email.trim()
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-mono text-sm font-semibold tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Reset Code"
          )}
        </button>
      </form>

      <BackToLogin />
    </>
  );
}

function CodeStep({
  email,
  code,
  setCode,
  error,
  loading,
  onSubmit,
  onBack,
}: {
  email: string;
  code: string;
  setCode: (value: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
  onBack: () => void;
}) {
  return (
    <>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <ShieldCheck className="h-6 w-6 text-primary" />
      </div>

      <h1 className="mt-6 text-center text-4xl font-bold tracking-tight text-foreground">
        Check Your Email
      </h1>

      <p className="mx-auto mt-3 max-w-sm text-center text-muted-foreground">
        We sent a password reset code to
      </p>

      <p className="mt-1 text-center text-sm font-semibold text-foreground">
        {email}
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={onSubmit}
      >
        <div className="space-y-2">
          <label
            htmlFor="code"
            className="label-mono block"
          >
            Verification code
          </label>

          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value.replace(
                  /\D/g,
                  "",
                ),
              )
            }
            placeholder="000000"
            disabled={loading}
            autoFocus
            className="h-12 w-full rounded-md border border-border bg-card px-4 text-center font-mono text-lg tracking-[0.35em] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <ErrorMessage error={error} />

        <button
          type="submit"
          disabled={
            loading || !code.trim()
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-mono text-sm font-semibold tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify Code"
          )}
        </button>
      </form>

      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-1 font-mono text-sm tracking-wide text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        Use a different email
      </button>
    </>
  );
}

function PasswordStep({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  error,
  loading,
  onSubmit,
}: {
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (
    value: string,
  ) => void;
  showPassword: boolean;
  setShowPassword: (
    value: boolean,
  ) => void;
  error: string;
  loading: boolean;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
}) {
  return (
    <>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-6 w-6 text-primary" />
      </div>

      <h1 className="mt-6 text-center text-4xl font-bold tracking-tight text-foreground">
        Create New Password
      </h1>

      <p className="mx-auto mt-3 max-w-sm text-center text-muted-foreground">
        Enter a new password for your
        Sanitary Logic account.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={onSubmit}
      >
        <PasswordInput
          id="password"
          label="New password"
          value={password}
          setValue={setPassword}
          showPassword={showPassword}
          setShowPassword={
            setShowPassword
          }
          autoComplete="new-password"
        />

        <PasswordInput
          id="confirm-password"
          label="Confirm password"
          value={confirmPassword}
          setValue={setConfirmPassword}
          showPassword={showPassword}
          setShowPassword={
            setShowPassword
          }
          autoComplete="new-password"
        />

        <ErrorMessage error={error} />

        <button
          type="submit"
          disabled={
            loading ||
            !password ||
            !confirmPassword
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-mono text-sm font-semibold tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Reset Password"
          )}
        </button>
      </form>
    </>
  );
}

function PasswordInput({
  id,
  label,
  value,
  setValue,
  showPassword,
  setShowPassword,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  setValue: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (
    value: boolean,
  ) => void;
  autoComplete: string;
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
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <input
          id={id}
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={value}
          onChange={(event) =>
            setValue(event.target.value)
          }
          autoComplete={autoComplete}
          placeholder="••••••••"
          className="h-12 w-full rounded-md border border-border bg-card pl-10 pr-11 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
        />

        <button
          type="button"
          onClick={() =>
            setShowPassword(
              !showPassword,
            )
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={
            showPassword
              ? "Hide password"
              : "Show password"
          }
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function ErrorMessage({
  error,
}: {
  error: string;
}) {
  if (!error) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3"
    >
      <p className="text-sm text-destructive">
        {error}
      </p>
    </div>
  );
}

function BackToLogin() {
  return (
    <Link
      href="/sign-in"
      className="mt-8 flex items-center justify-center gap-1 font-mono text-sm tracking-wide text-foreground hover:text-primary"
    >
      <ChevronLeft className="h-4 w-4" />
      Back to Login
    </Link>
  );
}