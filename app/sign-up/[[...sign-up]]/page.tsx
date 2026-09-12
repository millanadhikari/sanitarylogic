"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import {
  ArrowRight,
  Brush,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { AuthCard, AuthShell } from "@/components/auth/AuthShell";

type Step = "details" | "verification";

export default function SignUpPage() {
  const router = useRouter();

  const { signUp, errors, fetchStatus } = useSignUp();

  const [step, setStep] = useState<Step>("details");

  const [firstName, setFirstName] = useState("");

  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [verificationCode, setVerificationCode] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  const isLoading = fetchStatus === "fetching";

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

    if (!lastName.trim()) {
      setError("Last name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setError("");

      const { error: createError } = await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim(),
        password,
      });

      if (createError) {
        setError(createError.message ?? "Unable to create account.");

        return;
      }

      /*
       * Ask Clerk to send the verification
       * code to the user's email.
       */
      const { error: verificationError } =
        await signUp.verifications.sendEmailCode();

      if (verificationError) {
        setError(
          verificationError.message ?? "Unable to send verification code.",
        );

        return;
      }

      setStep("verification");

      toast.success("Verification code sent.");
    } catch (err) {
      console.error("Sign up failed:", err);

      setError(
        err instanceof Error ? err.message : "Unable to create account.",
      );
    }
  }

  async function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!verificationCode.trim()) {
      setError("Enter your verification code.");
      return;
    }

    try {
      setError("");

      const { error: verifyError } = await signUp.verifications.verifyEmailCode(
        {
          code: verificationCode.trim(),
        },
      );

      if (verifyError) {
        setError(verifyError.message ?? "Invalid verification code.");

        return;
      }

      if (signUp.status === "complete") {
        toast.success("Account created successfully.");

        await signUp.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl("/auth/redirect");

            if (url.startsWith("http")) {
              window.location.href = url;
              return;
            }

            router.replace(url);
          },
        });

        return;
      }

      console.log("Sign-up status:", signUp.status);

      setError("Account verification could not be completed.");
    } catch (err) {
      console.error("Email verification failed:", err);

      setError(err instanceof Error ? err.message : "Unable to verify email.");
    }
  }

  return (
    <AuthShell showHeader={false}>
      <div className="w-full max-w-md">
        {step === "details" ? (
          <SignUpDetails
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loading={isLoading}
            error={error}
            onSubmit={handleSignUp}
          />
        ) : (
          <VerificationStep
            email={email}
            code={verificationCode}
            setCode={setVerificationCode}
            error={error}
            loading={isLoading}
            onSubmit={handleVerifyEmail}
            onBack={() => {
              setError("");
              setVerificationCode("");
              setStep("details");
            }}
          />
        )}
      </div>
    </AuthShell>
  );
}

function SignUpDetails({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  loading,
  error,
  onSubmit,
}: {
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  loading: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <AuthCard>
      <div className="flex items-center justify-center gap-2">
        <Brush className="h-6 w-6 text-primary" />

        <span className="text-2xl font-bold tracking-tight text-foreground">
          Sanitary Logic
        </span>
      </div>

      <h1 className="mt-8 text-center text-4xl font-bold tracking-tight text-foreground">
        Create Account
      </h1>

      <p className="mt-2 text-center text-muted-foreground">
        Start managing your cleaning operations.
      </p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            id="first-name"
            label="First name"
            value={firstName}
            setValue={setFirstName}
            placeholder="John"
            icon={<User className="h-4 w-4" />}
            autoComplete="given-name"
          />

          <TextField
            id="last-name"
            label="Last name"
            value={lastName}
            setValue={setLastName}
            placeholder="Smith"
            icon={<User className="h-4 w-4" />}
            autoComplete="family-name"
          />
        </div>

        <TextField
          id="email"
          label="Email address"
          type="email"
          value={email}
          setValue={setEmail}
          placeholder="name@company.com"
          icon={<Mail className="h-4 w-4" />}
          autoComplete="email"
        />

        <PasswordField
          id="password"
          label="Password"
          value={password}
          setValue={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />

        <PasswordField
          id="confirm-password"
          label="Confirm password"
          value={confirmPassword}
          setValue={setConfirmPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />

        {password && confirmPassword && password !== confirmPassword && (
          <p className="text-sm text-destructive">Passwords do not match.</p>
        )}

        <ErrorMessage error={error} />

        {/* Required by Clerk Smart CAPTCHA for custom sign-up flows */}
        <div id="clerk-captcha" data-cl-theme="auto" data-cl-size="flexible" />

        <button
          type="submit"
          disabled={
            loading ||
            !firstName.trim() ||
            !lastName.trim() ||
            !email.trim() ||
            !password ||
            !confirmPassword
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create Account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />

        <span className="font-mono text-xs tracking-widest text-muted-foreground">
          OR
        </span>

        <span className="h-px flex-1 bg-border" />
      </div>

      <p className="mt-6 text-center text-sm text-foreground">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

function VerificationStep({
  email,
  code,
  setCode,
  loading,
  error,
  onSubmit,
  onBack,
}: {
  email: string;
  code: string;
  setCode: (value: string) => void;
  loading: boolean;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  return (
    <AuthCard>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <ShieldCheck className="h-6 w-6 text-primary" />
      </div>

      <h1 className="mt-6 text-center text-4xl font-bold tracking-tight text-foreground">
        Verify Your Email
      </h1>

      <p className="mx-auto mt-3 max-w-sm text-center text-muted-foreground">
        We sent a verification code to
      </p>

      <p className="mt-1 text-center text-sm font-semibold text-foreground">
        {email}
      </p>

      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="verification-code" className="label-mono block">
            Verification code
          </label>

          <input
            id="verification-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            disabled={loading}
            autoFocus
            className="h-12 w-full rounded-md border border-border bg-card px-4 text-center font-mono text-lg tracking-[0.35em] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-60"
          />
        </div>

        <ErrorMessage error={error} />

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify Email
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <button
        type="button"
        disabled={loading}
        onClick={onBack}
        className="mt-6 w-full text-center font-mono text-sm text-muted-foreground hover:text-primary"
      >
        Change email address
      </button>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Check your spam folder if the verification email hasn&apos;t arrived.
      </p>
    </AuthCard>
  );
}

function TextField({
  id,
  label,
  value,
  setValue,
  placeholder,
  icon,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder?: string;
  icon: React.ReactNode;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="label-mono block">
        {label}
      </label>

      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </div>

        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-md border border-border bg-card pl-10 pr-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
        />
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  setValue,
  showPassword,
  setShowPassword,
}: {
  id: string;
  label: string;
  value: string;
  setValue: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="label-mono block">
        {label}
      </label>

      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <input
          id={id}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="••••••••"
          className="h-12 w-full rounded-md border border-border bg-card pl-10 pr-11 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
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

function ErrorMessage({ error }: { error: string }) {
  if (!error) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3"
    >
      <p className="text-sm text-destructive">{error}</p>
    </div>
  );
}
