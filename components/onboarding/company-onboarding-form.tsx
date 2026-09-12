"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type Step = "company" | "site";

export default function CompanyOnboardingForm() {
  const router = useRouter();

  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [companyCreatedThisSession, setCompanyCreatedThisSession] =
    useState(false);
  const companyData = useQuery(
    api.companies.getMyCompany,
    isAuthenticated ? {} : "skip",
  );

  const sites = useQuery(
    api.sites.getMySites,
    isAuthenticated && companyData ? {} : "skip",
  );

  const createCompany = useMutation(api.companies.create);
  const createSite = useMutation(api.sites.create);

  const [step, setStep] = useState<Step>("company");
  const [companyId, setCompanyId] = useState<Id<"companies"> | null>(null);

  const [companyForm, setCompanyForm] = useState({
    name: "",
    legalName: "",
    tradingName: "",
    abn: "",
    email: "",
    phone: "",
  });

  const [siteForm, setSiteForm] = useState({
    name: "",
    code: "",
    address: "",
    suburb: "",
    state: "",
    postcode: "",
    country: "Australia",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!companyData) {
      return;
    }

    setCompanyId(companyData.company._id);

    if (!companyCreatedThisSession) {
      router.replace("/dashboard");
    }
  }, [companyData, companyCreatedThisSession, router]);

  const handleCompanySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!companyForm.name.trim()) {
      setError("Company name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const newCompanyId = await createCompany({
        name: companyForm.name,
        legalName: companyForm.legalName || undefined,
        tradingName: companyForm.tradingName || undefined,
        abn: companyForm.abn || undefined,
        email: companyForm.email || undefined,
        phone: companyForm.phone || undefined,
      });

      setCompanyId(newCompanyId);
      setCompanyCreatedThisSession(true);
      setStep("site");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong creating your company.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSiteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!companyId) {
      setError("Company could not be found");
      return;
    }

    if (!siteForm.name.trim()) {
      setError("Site name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      await createSite({
        companyId,
        name: siteForm.name,
        code: siteForm.code || undefined,
        address: siteForm.address || undefined,
        suburb: siteForm.suburb || undefined,
        state: siteForm.state || undefined,
        postcode: siteForm.postcode || undefined,
        country: siteForm.country || undefined,
      });

      router.replace("/dashboard");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong creating your site.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <LoadingScreen text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen text="Authenticating..." />;
  }

  if (companyData === undefined) {
    return <LoadingScreen text="Loading account..." />;
  }

  if (companyData && sites === undefined) {
    return <LoadingScreen text="Loading sites..." />;
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-zinc-950 p-12 text-white lg:flex">
          <div>
            <div className="mb-16 text-xl font-semibold">
              Cleaning Management
            </div>

            <div className="max-w-lg">
              <p className="mb-4 text-sm font-medium uppercase tracking-widest text-zinc-400">
                Company Setup
              </p>

              <h1 className="text-4xl font-semibold leading-tight">
                Set up your cleaning operations.
              </h1>

              <p className="mt-6 text-lg leading-8 text-zinc-400">
                Create your company and your first customer site.
              </p>
            </div>
          </div>

          <p className="text-sm text-zinc-500">
            Sites will later contain tenancies, areas, teams and cleaners.
          </p>
        </div>

        <div className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="w-full max-w-xl">
            <div className="mb-10 flex items-center gap-3">
              <StepCircle active complete={step === "site"}>
                1
              </StepCircle>

              <div className="h-px flex-1 bg-zinc-200" />

              <StepCircle active={step === "site"}>2</StepCircle>

              <div className="h-px flex-1 bg-zinc-200" />

              <StepCircle>3</StepCircle>
            </div>

            {step === "company" ? (
              <>
                <div className="mb-8">
                  <p className="mb-2 text-sm font-medium text-zinc-500">
                    Step 1 of 3
                  </p>

                  <h2 className="text-3xl font-semibold tracking-tight">
                    Create your company
                  </h2>

                  <p className="mt-2 text-sm text-zinc-500">
                    Add your main business details.
                  </p>
                </div>

                <form onSubmit={handleCompanySubmit} className="space-y-6">
                  <Field
                    label="Company name"
                    required
                    value={companyForm.name}
                    placeholder="ABC Cleaning Services"
                    onChange={(value) =>
                      setCompanyForm((current) => ({
                        ...current,
                        name: value,
                      }))
                    }
                  />

                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field
                      label="Legal name"
                      value={companyForm.legalName}
                      placeholder="ABC Cleaning Pty Ltd"
                      onChange={(value) =>
                        setCompanyForm((current) => ({
                          ...current,
                          legalName: value,
                        }))
                      }
                    />

                    <Field
                      label="Trading name"
                      value={companyForm.tradingName}
                      placeholder="ABC Cleaning"
                      onChange={(value) =>
                        setCompanyForm((current) => ({
                          ...current,
                          tradingName: value,
                        }))
                      }
                    />
                  </div>

                  <Field
                    label="ABN"
                    value={companyForm.abn}
                    placeholder="12 345 678 901"
                    onChange={(value) =>
                      setCompanyForm((current) => ({
                        ...current,
                        abn: value,
                      }))
                    }
                  />

                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field
                      label="Company email"
                      type="email"
                      value={companyForm.email}
                      placeholder="admin@example.com"
                      onChange={(value) =>
                        setCompanyForm((current) => ({
                          ...current,
                          email: value,
                        }))
                      }
                    />

                    <Field
                      label="Phone"
                      value={companyForm.phone}
                      placeholder="02 9000 0000"
                      onChange={(value) =>
                        setCompanyForm((current) => ({
                          ...current,
                          phone: value,
                        }))
                      }
                    />
                  </div>

                  <ErrorMessage error={error} />

                  <div className="space-y-3">
                    <SubmitButton loading={isSubmitting}>
                      Create site
                    </SubmitButton>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => router.replace("/dashboard")}
                      className="flex h-11 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Skip for now
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <p className="mb-2 text-sm font-medium text-zinc-500">
                    Step 2 of 3
                  </p>

                  <h2 className="text-3xl font-semibold tracking-tight">
                    Create your first site
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Add your first cleaning site now, or skip this step and
                    create one later from the dashboard.
                  </p>
                </div>

                <form onSubmit={handleSiteSubmit} className="space-y-6">
                  <Field
                    label="Site name"
                    required
                    value={siteForm.name}
                    placeholder="Sydney CBD"
                    onChange={(value) =>
                      setSiteForm((current) => ({
                        ...current,
                        name: value,
                      }))
                    }
                  />

                  <Field
                    label="Site code"
                    value={siteForm.code}
                    placeholder="SYD-CBD"
                    onChange={(value) =>
                      setSiteForm((current) => ({
                        ...current,
                        code: value,
                      }))
                    }
                  />

                  <Field
                    label="Street address"
                    value={siteForm.address}
                    placeholder="100 George Street"
                    onChange={(value) =>
                      setSiteForm((current) => ({
                        ...current,
                        address: value,
                      }))
                    }
                  />

                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field
                      label="Suburb"
                      value={siteForm.suburb}
                      placeholder="Sydney"
                      onChange={(value) =>
                        setSiteForm((current) => ({
                          ...current,
                          suburb: value,
                        }))
                      }
                    />

                    <Field
                      label="State"
                      value={siteForm.state}
                      placeholder="NSW"
                      onChange={(value) =>
                        setSiteForm((current) => ({
                          ...current,
                          state: value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field
                      label="Postcode"
                      value={siteForm.postcode}
                      placeholder="2000"
                      onChange={(value) =>
                        setSiteForm((current) => ({
                          ...current,
                          postcode: value,
                        }))
                      }
                    />

                    <Field
                      label="Country"
                      value={siteForm.country}
                      placeholder="Australia"
                      onChange={(value) =>
                        setSiteForm((current) => ({
                          ...current,
                          country: value,
                        }))
                      }
                    />
                  </div>

                  <ErrorMessage error={error} />

                  <SubmitButton loading={isSubmitting}>
                    Create site
                  </SubmitButton>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
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
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-900">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
      />
    </div>
  );
}

function SubmitButton({
  children,
  loading,
}: {
  children: React.ReactNode;
  loading: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-950 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}

function ErrorMessage({ error }: { error: string }) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm text-red-700">{error}</p>
    </div>
  );
}

function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-zinc-500">{text}</p>
    </div>
  );
}

function StepCircle({
  children,
  active = false,
  complete = false,
}: {
  children: React.ReactNode;
  active?: boolean;
  complete?: boolean;
}) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
        active
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-300 bg-white text-zinc-500"
      }`}
    >
      {complete ? "✓" : children}
    </div>
  );
}
