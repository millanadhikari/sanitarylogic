"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQuery,
} from "convex/react";
import {
  ArrowRight,
  Building2,
  Check,
  Loader2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type Step = "company" | "site";

export default function OnboardingClient() {
  const router = useRouter();

  const companyData = useQuery(
    api.companies.getMyCompany,
  );

  const createCompany = useMutation(
    api.companies.create,
  );

  const createSite = useMutation(
    api.sites.create,
  );

  const [step, setStep] =
    useState<Step>("company");

  /*
   * This tells us whether THIS onboarding
   * page created the company.
   *
   * Without this flag, Convex would update
   * companyData immediately after creation
   * and we'd redirect before showing the
   * optional site step.
   */
  const [
    companyCreatedHere,
    setCompanyCreatedHere,
  ] = useState(false);

  const [companyId, setCompanyId] =
    useState<Id<"companies"> | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [companyForm, setCompanyForm] =
    useState({
      name: "",
      legalName: "",
      tradingName: "",
      abn: "",
      email: "",
      phone: "",
    });

  const [siteForm, setSiteForm] =
    useState({
      name: "",
      code: "",
      address: "",
      suburb: "",
      state: "",
      postcode: "",
      country: "Australia",
    });

  /*
   * Someone who already belongs to a company
   * shouldn't be able to redo onboarding.
   */
  useEffect(() => {
    if (companyData === undefined) {
      return;
    }

    if (
      companyData &&
      !companyCreatedHere
    ) {
      router.replace("/dashboard");
    }
  }, [
    companyData,
    companyCreatedHere,
    router,
  ]);

  async function handleCreateCompany(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!companyForm.name.trim()) {
      setError("Company name is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const newCompanyId =
        await createCompany({
          name: companyForm.name.trim(),

          legalName:
            companyForm.legalName.trim() ||
            undefined,

          tradingName:
            companyForm.tradingName.trim() ||
            undefined,

          abn:
            companyForm.abn.trim() ||
            undefined,

          email:
            companyForm.email.trim() ||
            undefined,

          phone:
            companyForm.phone.trim() ||
            undefined,
        });

      /*
       * IMPORTANT:
       * set this BEFORE moving to site setup.
       */
      setCompanyId(newCompanyId);
      setCompanyCreatedHere(true);
      setStep("site");

      toast.success("Company created.");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create company.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSite(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!companyId) {
      setError("Company could not be found.");
      return;
    }

    if (!siteForm.name.trim()) {
      setError("Site name is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await createSite({
        companyId,

        name: siteForm.name.trim(),

        code:
          siteForm.code.trim() ||
          undefined,

        address:
          siteForm.address.trim() ||
          undefined,

        suburb:
          siteForm.suburb.trim() ||
          undefined,

        state:
          siteForm.state.trim() ||
          undefined,

        postcode:
          siteForm.postcode.trim() ||
          undefined,

        country:
          siteForm.country.trim() ||
          undefined,
      });

      toast.success("Site created.");

      router.replace("/dashboard");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create site.",
      );
    } finally {
      setLoading(false);
    }
  }

  function skipSite() {
    router.replace("/dashboard");
  }

  if (companyData === undefined) {
    return <OnboardingLoader />;
  }

  /*
   * Existing users will be redirected by
   * the effect above.
   */
  if (
    companyData &&
    !companyCreatedHere
  ) {
    return <OnboardingLoader />;
  }

  return (
    <main className="grid-canvas min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        {/* Logo */}
        <header>
          <span className="text-xl font-bold tracking-tight text-foreground">
            Sanitary Logic
          </span>
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-2xl">
            <Progress step={step} />

            {step === "company" ? (
              <CompanyStep
                form={companyForm}
                setForm={setCompanyForm}
                loading={loading}
                error={error}
                onSubmit={
                  handleCreateCompany
                }
              />
            ) : (
              <SiteStep
                form={siteForm}
                setForm={setSiteForm}
                loading={loading}
                error={error}
                onSubmit={
                  handleCreateSite
                }
                onSkip={skipSite}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function CompanyStep({
  form,
  setForm,
  loading,
  error,
  onSubmit,
}: {
  form: {
    name: string;
    legalName: string;
    tradingName: string;
    abn: string;
    email: string;
    phone: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<typeof form>
  >;
  loading: boolean;
  error: string;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-card sm:p-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Building2 className="h-6 w-6 text-primary" />
      </div>

      <p className="label-mono mt-6">
        Step 1 of 2
      </p>

      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Set up your company
      </h1>

      <p className="mt-3 text-muted-foreground">
        Tell us about your cleaning business.
        You&apos;ll be set up as the Super Admin.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-5"
      >
        <Field
          label="Company name"
          value={form.name}
          required
          placeholder="Precision Cleaning Services"
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              name: value,
            }))
          }
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Legal name"
            value={form.legalName}
            placeholder="Precision Cleaning Pty Ltd"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                legalName: value,
              }))
            }
          />

          <Field
            label="Trading name"
            value={form.tradingName}
            placeholder="Precision Cleaning"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                tradingName: value,
              }))
            }
          />
        </div>

        <Field
          label="ABN"
          value={form.abn}
          placeholder="12 345 678 901"
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              abn: value,
            }))
          }
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Company email"
            type="email"
            value={form.email}
            placeholder="admin@company.com.au"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                email: value,
              }))
            }
          />

          <Field
            label="Phone"
            value={form.phone}
            placeholder="02 9000 0000"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                phone: value,
              }))
            }
          />
        </div>

        <ErrorMessage error={error} />

        <button
          type="submit"
          disabled={
            loading || !form.name.trim()
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating company...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function SiteStep({
  form,
  setForm,
  loading,
  error,
  onSubmit,
  onSkip,
}: {
  form: {
    name: string;
    code: string;
    address: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<typeof form>
  >;
  loading: boolean;
  error: string;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
  onSkip: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-card sm:p-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <MapPin className="h-6 w-6 text-primary" />
      </div>

      <p className="label-mono mt-6">
        Step 2 of 2 · Optional
      </p>

      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Add your first site
      </h1>

      <p className="mt-3 text-muted-foreground">
        Add a location you service now, or skip
        this and create sites later from the
        dashboard.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
          <Field
            label="Site name"
            value={form.name}
            placeholder="Sydney CBD"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                name: value,
              }))
            }
          />

          <Field
            label="Site code"
            value={form.code}
            placeholder="SYD-CBD"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                code: value,
              }))
            }
          />
        </div>

        <Field
          label="Street address"
          value={form.address}
          placeholder="100 George Street"
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              address: value,
            }))
          }
        />

        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Suburb"
            value={form.suburb}
            placeholder="Sydney"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                suburb: value,
              }))
            }
          />

          <Field
            label="State"
            value={form.state}
            placeholder="NSW"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                state: value,
              }))
            }
          />

          <Field
            label="Postcode"
            value={form.postcode}
            placeholder="2000"
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                postcode: value,
              }))
            }
          />
        </div>

        <Field
          label="Country"
          value={form.country}
          placeholder="Australia"
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              country: value,
            }))
          }
        />

        <ErrorMessage error={error} />

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={loading}
            onClick={onSkip}
            className="h-12 flex-1 rounded-md border border-border bg-card px-5 font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Skip for now
          </button>

          <button
            type="submit"
            disabled={
              loading || !form.name.trim()
            }
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create Site
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function Progress({
  step,
}: {
  step: Step;
}) {
  const siteStep = step === "site";

  return (
    <div className="mb-6 flex items-center gap-3">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
          siteStep
            ? "bg-primary text-primary-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {siteStep ? (
          <Check className="h-4 w-4" />
        ) : (
          "1"
        )}
      </div>

      <div
        className={`h-px flex-1 ${
          siteStep
            ? "bg-primary"
            : "bg-border"
        }`}
      />

      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold ${
          siteStep
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-muted-foreground"
        }`}
      >
        2
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="label-mono block">
        {label}

        {required && (
          <span className="ml-1 text-destructive">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="h-12 w-full rounded-md border border-border bg-background px-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
      />
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

function OnboardingLoader() {
  return (
    <main className="grid-canvas flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />

        <p className="mt-4 text-sm text-muted-foreground">
          Loading your workspace...
        </p>
      </div>
    </main>
  );
}