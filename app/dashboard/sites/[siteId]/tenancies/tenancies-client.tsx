"use client";

import { FormEvent, useMemo, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";

import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

type TenancyItem =
  Doc<"tenancies">;

type TenancyForm = {
  name: string;
  floor: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  description: string;
};


type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const emptyForm: TenancyForm = {
  name: "",
  floor: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  description: "",
};

// type TenancyItem = {
//   _id: Id<"tenancies">;
//   _creationTime: number;

//   companyId: Id<"companies">;
//   siteId: Id<"sites">;

//   name: string;

//   contactName?: string;
//   contactEmail?: string;
//   contactPhone?: string;

//   floor?: string;
//   description?: string;

//   status: "ACTIVE" | "INACTIVE";

//   createdAt: number;
//   updatedAt: number;
// };

export default function TenanciesClient() {
  const params = useParams<{
    siteId: string;
  }>();

  const siteId = params.siteId as Id<"sites">;

  const siteData = useQuery(api.sites.getById, {
    siteId,
  });

  const tenancies = useQuery(api.tenancies.getBySite, {
    siteId,
  });

  const createTenancy = useMutation(api.tenancies.create);

  const updateTenancy = useMutation(api.tenancies.update);

  const setStatus = useMutation(api.tenancies.setStatus);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [showModal, setShowModal] = useState(false);

  const [editingId, setEditingId] = useState<Id<"tenancies"> | null>(null);

  const [form, setForm] = useState<TenancyForm>(emptyForm);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const filteredTenancies = useMemo(() => {
    if (!tenancies) {
      return [];
    }

    const term = search.trim().toLowerCase();

    return tenancies.filter((tenancy) => {
      const matchesStatus =
        statusFilter === "ALL" || tenancy.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [
        tenancy.name,
        tenancy.floor,
        tenancy.contactName,
        tenancy.contactEmail,
        tenancy.contactPhone,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [tenancies, search, statusFilter]);

  if (siteData === undefined || tenancies === undefined) {
    return <PageLoading />;
  }

  if (!siteData) {
    return null;
  }

  const site = siteData.site;

  const activeCount = tenancies.filter(
    (tenancy) => tenancy.status === "ACTIVE",
  ).length;

  const archivedCount = tenancies.length - activeCount;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function openEdit(tenancy: TenancyItem) {
    setEditingId(tenancy._id);

    setForm({
      name: tenancy.name ?? "",
      floor: tenancy.floor ?? "",
      contactName: tenancy.contactName ?? "",
      contactEmail: tenancy.contactEmail ?? "",
      contactPhone: tenancy.contactPhone ?? "",
      description: tenancy.description ?? "",
    });

    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (submitting) {
      return;
    }

    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Tenancy name is required.");

      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const values = {
        name: form.name.trim(),

        floor: form.floor.trim() || undefined,

        contactName: form.contactName.trim() || undefined,

        contactEmail: form.contactEmail.trim() || undefined,

        contactPhone: form.contactPhone.trim() || undefined,

        description: form.description.trim() || undefined,
      };

      if (editingId) {
        await updateTenancy({
          tenancyId: editingId,
          ...values,
        });

        toast.success("Tenancy updated.");
      } else {
        await createTenancy({
          siteId,
          ...values,
        });

        toast.success("Tenancy added.");
      }

      closeModal();
    } catch (err) {
      console.error(err);

      setError(err instanceof Error ? err.message : "Unable to save tenancy.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(tenancy: TenancyItem) {
    try {
      const nextStatus = tenancy.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

      await setStatus({
        tenancyId: tenancy._id,
        status: nextStatus,
      });

      toast.success(
        nextStatus === "ACTIVE" ? "Tenancy restored." : "Tenancy archived.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to update tenancy.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      {/* Header */}
      <Link
        href={`/dashboard/sites/${siteId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Site
      </Link>

      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label-caps text-muted-foreground">Site Management</p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-[2.5rem]">
            Tenancies
          </h1>

          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4" />

            <span>{site.name}</span>

            <span>•</span>

            <span>
              {tenancies.length}{" "}
              {tenancies.length === 1 ? "tenancy" : "tenancies"}
            </span>
          </div>
        </div>

        <Button
          onClick={openCreate}
          className="h-11 gap-2 rounded-xl font-semibold"
        >
          <Plus className="size-4" />
          Add Tenancy
        </Button>
      </div>

      {/* Metrics */}
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Tenancies" value={tenancies.length} />

        <MetricCard label="Active" value={activeCount} />

        <MetricCard label="Archived" value={archivedCount} />
      </div>

      {/* Directory */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Search / Filter */}
        <div className="border-b border-border px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">
                Tenancy Directory
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                View and manage all tenancies operating at this site.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tenancies..."
                  className="search-input h-10 w-full rounded-lg border border-border bg-background pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
                />
              </div>

              <div className="flex rounded-lg border border-border bg-background p-1">
                <FilterButton
                  active={statusFilter === "ALL"}
                  onClick={() => setStatusFilter("ALL")}
                >
                  All
                </FilterButton>

                <FilterButton
                  active={statusFilter === "ACTIVE"}
                  onClick={() => setStatusFilter("ACTIVE")}
                >
                  Active
                </FilterButton>

                <FilterButton
                  active={statusFilter === "INACTIVE"}
                  onClick={() => setStatusFilter("INACTIVE")}
                >
                  Archived
                </FilterButton>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {filteredTenancies.length === 0 ? (
          <EmptyTenancies
            searching={!!search || statusFilter !== "ALL"}
            onAdd={openCreate}
          />
        ) : (
          <div className="divide-y divide-border">
            {filteredTenancies.map((tenancy) => (
              <div
                key={tenancy._id}
                className="group flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-muted/30 lg:flex-row lg:items-center"
              >
                {/* Clickable tenancy */}
                <Link
                  href={`/dashboard/sites/${siteId}/tenancies/${tenancy._id}`}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold">{tenancy.name}</p>

                      <StatusBadge status={tenancy.status} />
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {tenancy.floor && <span>{tenancy.floor}</span>}

                      {tenancy.contactName && (
                        <span className="flex items-center gap-1.5">
                          <UserRound className="size-3.5" />

                          {tenancy.contactName}
                        </span>
                      )}

                      {tenancy.contactEmail && (
                        <span className="hidden items-center gap-1.5 md:flex">
                          <Mail className="size-3.5" />

                          {tenancy.contactEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-2 lg:ml-4">
                  {tenancy.contactEmail && (
                    <a
                      href={`mailto:${tenancy.contactEmail}`}
                      title="Email"
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Mail className="size-4" />
                    </a>
                  )}

                  {tenancy.contactPhone && (
                    <a
                      href={`tel:${tenancy.contactPhone}`}
                      title="Call"
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Phone className="size-4" />
                    </a>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(tenancy)}
                    className="gap-2"
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(tenancy)}
                  >
                    {tenancy.status === "ACTIVE" ? "Archive" : "Restore"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Result count */}
        {filteredTenancies.length > 0 && (
          <div className="border-t border-border px-6 py-4">
            <p className="text-xs text-muted-foreground">
              Showing {filteredTenancies.length} of {tenancies.length} tenancies
            </p>
          </div>
        )}
      </section>

      {showModal && (
        <TenancyModal
          editing={editingId !== null}
          form={form}
          setForm={setForm}
          error={error}
          submitting={submitting}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="label-caps text-muted-foreground">{label}</p>

      <p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";

  return (
    <span
      className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {active ? "Active" : "Archived"}
    </span>
  );
}

function EmptyTenancies({
  searching,
  onAdd,
}: {
  searching: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Building2 className="size-5" />
      </span>

      <p className="mt-4 font-bold">
        {searching ? "No matching tenancies" : "No tenancies yet"}
      </p>

      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        {searching
          ? "Try changing your search or filter."
          : "Add the first business or occupant for this site."}
      </p>

      {!searching && (
        <Button onClick={onAdd} className="mt-5 gap-2">
          <Plus className="size-4" />
          Add Tenancy
        </Button>
      )}
    </div>
  );
}

function TenancyModal({
  editing,
  form,
  setForm,
  error,
  submitting,
  onClose,
  onSubmit,
}: {
  editing: boolean;

  form: TenancyForm;

  setForm: React.Dispatch<React.SetStateAction<TenancyForm>>;

  error: string;

  submitting: boolean;

  onClose: () => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function updateField(field: keyof TenancyForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <button
        type="button"
        aria-label="Close tenancy form"
        onClick={onClose}
        className="absolute inset-0"
      />

      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="label-caps text-muted-foreground">Tenancy</p>

            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              {editing ? "Edit Tenancy" : "Add Tenancy"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
          <FormField label="Tenancy Name" required>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Australian Military Bank"
              className="form-input"
            />
          </FormField>

          <FormField label="Floor / Location">
            <input
              value={form.floor}
              onChange={(event) => updateField("floor", event.target.value)}
              placeholder="Level 1"
              className="form-input"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Contact Name">
              <input
                value={form.contactName}
                onChange={(event) =>
                  updateField("contactName", event.target.value)
                }
                placeholder="Jane Smith"
                className="form-input"
              />
            </FormField>

            <FormField label="Contact Phone">
              <input
                value={form.contactPhone}
                onChange={(event) =>
                  updateField("contactPhone", event.target.value)
                }
                placeholder="02 1234 5678"
                className="form-input"
              />
            </FormField>
          </div>

          <FormField label="Contact Email">
            <input
              type="email"
              value={form.contactEmail}
              onChange={(event) =>
                updateField("contactEmail", event.target.value)
              }
              placeholder="facilities@company.com"
              className="form-input"
            />
          </FormField>

          <FormField label="Description">
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="General information about this tenancy..."
              className="form-input min-h-28 resize-y py-3"
            />
          </FormField>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={submitting || !form.name.trim()}>
            {submitting
              ? "Saving..."
              : editing
                ? "Save Changes"
                : "Add Tenancy"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      <div className="h-44 animate-pulse rounded-2xl bg-muted" />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>

      <div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="label-caps text-muted-foreground">
        {label}

        {required && (
          <span className="ml-1 text-destructive">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}
