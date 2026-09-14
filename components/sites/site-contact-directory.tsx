"use client";

import { useMutation, useQuery } from "convex/react";
import { Mail, Pencil, Phone, Plus, Trash2, UserRound, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

type ContactFields = {
  name: string;
  jobTitle?: string;
  organisation?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export function SiteContactDirectory({ siteId }: { siteId: Id<"sites"> }) {
  const data = useQuery(api.siteContacts.list, { siteId });
  const createContact = useMutation(api.siteContacts.create);
  const updateContact = useMutation(api.siteContacts.update);
  const removeContact = useMutation(api.siteContacts.remove);
  const [editing, setEditing] = useState<Doc<"siteContacts"> | "NEW" | null>(null);

  if (data === undefined) {
    return <div className="h-72 animate-pulse rounded-2xl bg-muted" />;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <p className="label-caps text-muted-foreground">Contacts</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight">
            Site Contact Directory
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.contacts.length} {data.contacts.length === 1 ? "contact" : "contacts"} for this site.
          </p>
        </div>

        {data.canManage && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => setEditing("NEW")}
          >
            <Plus className="size-4" />
            Add Contact
          </Button>
        )}
      </div>

      {data.contacts.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <UserRound className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-bold">No site contacts</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add property, facilities, security or building contacts here.
          </p>
        </div>
      ) : (
        <div className="max-h-[520px] divide-y divide-border overflow-y-auto">
          {data.contacts.map((contact) => (
            <div key={contact._id} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-4 px-6 py-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {initials(contact.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words font-bold">{contact.name}</p>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {[contact.jobTitle, contact.organisation].filter(Boolean).join(" · ") || "Site contact"}
                </p>
                <div className="mt-3 flex min-w-0 flex-wrap gap-x-5 gap-y-2">
                  {contact.email && (
                    <a title={`Email ${contact.name}`} href={`mailto:${contact.email}`} className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline">
                      <Mail className="size-4 shrink-0" />
                      <span className="break-all">{contact.email}</span>
                    </a>
                  )}
                  {contact.phone && (
                    <a title={`Call ${contact.name}`} href={`tel:${contact.phone}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline">
                      <Phone className="size-4 shrink-0" />
                      <span>{contact.phone}</span>
                    </a>
                  )}
                  {!contact.email && !contact.phone && (
                    <span className="text-xs text-muted-foreground">No contact details</span>
                  )}
                </div>
                {contact.notes && (
                  <p className="mt-2 break-words text-xs text-muted-foreground">{contact.notes}</p>
                )}
              </div>
              {data.canManage ? (
                <div className="flex shrink-0 items-center gap-1">
                    <button title={`Edit ${contact.name}`} onClick={() => setEditing(contact)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Pencil className="size-4" />
                    </button>
                    <button
                      title={`Delete ${contact.name}`}
                      onClick={async () => {
                        if (!window.confirm(`Delete ${contact.name} from this site?`)) return;
                        try {
                          await removeContact({ contactId: contact._id });
                          toast.success("Contact deleted");
                        } catch (error) {
                          toast.error(errorMessage(error));
                        }
                      }}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                </div>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ContactModal
          contact={editing === "NEW" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={async (fields) => {
            if (editing === "NEW") {
              await createContact({ siteId, ...fields });
              toast.success("Contact added");
            } else {
              await updateContact({ contactId: editing._id, ...fields });
              toast.success("Contact updated");
            }
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

function ContactModal({
  contact,
  onClose,
  onSave,
}: {
  contact?: Doc<"siteContacts">;
  onClose: () => void;
  onSave: (fields: ContactFields) => Promise<void>;
}) {
  const [fields, setFields] = useState({
    name: contact?.name ?? "",
    jobTitle: contact?.jobTitle ?? "",
    organisation: contact?.organisation ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    notes: contact?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const optional = (value: string) => value.trim() || undefined;
      await onSave({
        name: fields.name.trim(),
        ...(optional(fields.jobTitle) ? { jobTitle: optional(fields.jobTitle) } : {}),
        ...(optional(fields.organisation) ? { organisation: optional(fields.organisation) } : {}),
        ...(optional(fields.email) ? { email: optional(fields.email) } : {}),
        ...(optional(fields.phone) ? { phone: optional(fields.phone) } : {}),
        ...(optional(fields.notes) ? { notes: optional(fields.notes) } : {}),
      });
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-extrabold">{contact ? "Edit Contact" : "Add Site Contact"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Store the key contact details for this site.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted"><X className="size-5" /></button>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Field label="Name *"><input required className="form-input" value={fields.name} onChange={(e) => setFields((current) => ({ ...current, name: e.target.value }))} /></Field>
          <Field label="Job title / role"><input className="form-input" value={fields.jobTitle} onChange={(e) => setFields((current) => ({ ...current, jobTitle: e.target.value }))} /></Field>
          <Field label="Organisation"><input className="form-input" value={fields.organisation} onChange={(e) => setFields((current) => ({ ...current, organisation: e.target.value }))} /></Field>
          <Field label="Phone"><input type="tel" className="form-input" value={fields.phone} onChange={(e) => setFields((current) => ({ ...current, phone: e.target.value }))} /></Field>
          <div className="sm:col-span-2"><Field label="Email"><input type="email" className="form-input" value={fields.email} onChange={(e) => setFields((current) => ({ ...current, email: e.target.value }))} /></Field></div>
          <div className="sm:col-span-2"><Field label="Notes"><textarea className="form-input min-h-24 resize-y py-3" value={fields.notes} onChange={(e) => setFields((current) => ({ ...current, notes: e.target.value }))} /></Field></div>
          {error && <p className="sm:col-span-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t p-5">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : contact ? "Save Changes" : "Add Contact"}</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="label-caps text-muted-foreground">{label}</span><span className="mt-2 block">{children}</span></label>;
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}
