"use client";

import { FormEvent, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export type EmployeeFields = {
  employeeNumber?: string; firstName: string; lastName: string; email?: string; phone?: string;
  jobTitle?: string; employmentType: "FULL_TIME" | "PART_TIME" | "CASUAL" | "CONTRACTOR";
  startDate?: number; emergencyContactName?: string; emergencyContactPhone?: string; emergencyContactRelationship?: string;
  address?: string; suburb?: string; state?: string; postcode?: string; notes?: string;
};
type Site = { _id: Id<"sites">; name: string };

export function EmployeeForm({
  initial, sites = [], initialSiteId, showSite = false, submitLabel = "Save Employee", onSubmit, onCancel,
}: {
  initial?: Partial<EmployeeFields>; sites?: Site[]; initialSiteId?: Id<"sites">; showSite?: boolean;
  submitLabel?: string;
  onSubmit: (fields: EmployeeFields, siteId?: Id<"sites">) => Promise<void>; onCancel: () => void;
}) {
  const [fields, setFields] = useState({
    employeeNumber: initial?.employeeNumber ?? "", firstName: initial?.firstName ?? "", lastName: initial?.lastName ?? "",
    email: initial?.email ?? "", phone: initial?.phone ?? "", jobTitle: initial?.jobTitle ?? "",
    employmentType: initial?.employmentType ?? "CASUAL",
    startDate: initial?.startDate ? new Date(initial.startDate).toISOString().slice(0, 10) : "",
    emergencyContactName: initial?.emergencyContactName ?? "", emergencyContactPhone: initial?.emergencyContactPhone ?? "",
    emergencyContactRelationship: initial?.emergencyContactRelationship ?? "",
    address: initial?.address ?? "", suburb: initial?.suburb ?? "", state: initial?.state ?? "", postcode: initial?.postcode ?? "",
    notes: initial?.notes ?? "",
  });
  const [siteId, setSiteId] = useState<string>(initialSiteId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof fields, value: string) => setFields((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const optional = (value: string) => value.trim() || undefined;
      await onSubmit({
        employeeNumber: optional(fields.employeeNumber), firstName: fields.firstName.trim(), lastName: fields.lastName.trim(),
        email: optional(fields.email), phone: optional(fields.phone), jobTitle: optional(fields.jobTitle),
        employmentType: fields.employmentType as EmployeeFields["employmentType"],
        startDate: fields.startDate ? new Date(`${fields.startDate}T00:00:00`).getTime() : undefined,
        emergencyContactName: optional(fields.emergencyContactName), emergencyContactPhone: optional(fields.emergencyContactPhone),
        emergencyContactRelationship: optional(fields.emergencyContactRelationship),
        address: optional(fields.address), suburb: optional(fields.suburb), state: optional(fields.state), postcode: optional(fields.postcode), notes: optional(fields.notes),
      }, siteId ? siteId as Id<"sites"> : undefined);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save employee"); }
    finally { setSaving(false); }
  }
  const inputs: Array<[keyof typeof fields, string, string]> = [
    ["employeeNumber", "Employee number", "text"], ["firstName", "First name", "text"], ["lastName", "Last name", "text"],
    ["email", "Email", "email"], ["phone", "Phone", "tel"], ["jobTitle", "Job title", "text"], ["startDate", "Start date", "date"],
    ["emergencyContactName", "Emergency contact", "text"], ["emergencyContactPhone", "Emergency phone", "tel"],
    ["emergencyContactRelationship", "Emergency relationship", "text"],
    ["address", "Address", "text"], ["suburb", "Suburb", "text"], ["state", "State", "text"], ["postcode", "Postcode", "text"],
  ];
  return <form onSubmit={submit} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      {inputs.map(([key, label, type]) => <label key={key} className={key === "address" ? "sm:col-span-2" : ""}>
        <span className="label-caps text-muted-foreground">{label}{(key === "firstName" || key === "lastName") ? " *" : ""}</span>
        <input className="form-input mt-2" type={type} required={key === "firstName" || key === "lastName"} value={fields[key]} onChange={(event) => set(key, event.target.value)} />
      </label>)}
      <label><span className="label-caps text-muted-foreground">Employment type</span>
        <select className="form-input mt-2" value={fields.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
          <option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="CASUAL">Casual</option><option value="CONTRACTOR">Contractor</option>
        </select>
      </label>
      {showSite && <label><span className="label-caps text-muted-foreground">Initial site</span>
        <select className="form-input mt-2" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">No site yet</option>{sites.map((site) => <option key={site._id} value={site._id}>{site.name}</option>)}
        </select>
      </label>}
      <label className="sm:col-span-2"><span className="label-caps text-muted-foreground">Notes</span>
        <textarea className="form-input mt-2 min-h-24" value={fields.notes} onChange={(e) => set("notes", e.target.value)} />
      </label>
    </div>
    {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</Button></div>
  </form>;
}
