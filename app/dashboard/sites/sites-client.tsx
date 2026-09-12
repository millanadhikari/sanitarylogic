"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Plus } from "lucide-react";

export default function SitesClient() {
  const router = useRouter();

  const companyData = useQuery(api.companies.getMyCompany);
  const sites = useQuery(api.sites.getMySites);

  const createSite = useMutation(api.sites.create);

  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    suburb: "",
    state: "",
    postcode: "",
    country: "Australia",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (companyData === undefined || sites === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-zinc-500">Loading sites...</p>
      </div>
    );
  }

  if (!companyData) {
    return null;
  }

  const canCreate = companyData.membership.role === "SUPER_ADMIN";

  async function handleCreate() {
    if (!companyData) {
      setError("Company not found");
      return;
    }

    if (!form.name.trim()) {
      setError("Site name is required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await createSite({
        companyId: companyData.company._id,
        name: form.name,
        code: form.code || undefined,
        address: form.address || undefined,
        suburb: form.suburb || undefined,
        state: form.state || undefined,
        postcode: form.postcode || undefined,
        country: form.country || undefined,
      });

      setForm({
        name: "",
        code: "",
        address: "",
        suburb: "",
        state: "",
        postcode: "",
        country: "Australia",
      });

      setShowCreate(false);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error ? error.message : "Failed to create site",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-zinc-500">Operations</p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">
            Sites
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Manage the locations serviced by {companyData.company.name}.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Add site
          </button>
        )}
      </div>

      {sites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
            <Building2 className="h-6 w-6 text-zinc-600" />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-zinc-950">
            No sites yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
            Sites are the physical locations your cleaning company manages.
          </p>

          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
              Create your first site
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => (
            <button
              key={site._id}
              onClick={() => router.push(`/dashboard/sites/${site._id}`)}
              className="group rounded-xl border border-zinc-200 bg-white p-5 text-left transition hover:border-zinc-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                  <Building2 className="h-5 w-5 text-zinc-700" />
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    site.status === "ACTIVE"
                      ? "bg-green-50 text-green-700"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {site.status}
                </span>
              </div>

              <h2 className="mt-5 font-semibold text-zinc-950">{site.name}</h2>

              {site.code && (
                <p className="mt-1 text-xs font-medium text-zinc-400">
                  {site.code}
                </p>
              )}

              <div className="mt-4 flex items-start gap-2 text-sm text-zinc-500">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />

                <span>
                  {[site.address, site.suburb, site.state, site.postcode]
                    .filter(Boolean)
                    .join(", ") || "No address added"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="border-b border-zinc-200 px-6 py-5">
              <h2 className="text-lg font-semibold">Add site</h2>

              <p className="mt-1 text-sm text-zinc-500">
                Add a new cleaning location.
              </p>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
              <Field
                label="Site name"
                required
                value={form.name}
                placeholder="Westfield Sydney"
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
                placeholder="WSYD"
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    code: value,
                  }))
                }
              />

              <Field
                label="Street address"
                value={form.address}
                placeholder="100 Market Street"
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    address: value,
                  }))
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-200 px-6 py-4">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setShowCreate(false);
                  setError("");
                }}
                className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleCreate}
                className="h-10 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create site"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-900">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
      />
    </div>
  );
}
