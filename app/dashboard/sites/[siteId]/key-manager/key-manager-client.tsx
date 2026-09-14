"use client";

import { useConvex, useMutation, useQuery } from "convex/react";
import { ArrowLeft, Eye, EyeOff, KeyRound, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type PageData = NonNullable<ReturnType<typeof useQuery<typeof api.siteKeys.list>>>;
type KeyRow = PageData["keys"][number];
type Assignee = PageData["assignees"][number];
type FormValues = {
  assignee: string;
  usageWindow: string;
  keyName: string;
  keyNumber: string;
  quantity: number;
  details?: string;
  code?: string;
  passcode?: string;
  clearPasscode: boolean;
};

export default function KeyManagerClient() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId as Id<"sites">;
  const convex = useConvex();
  const data = useQuery(api.siteKeys.list, { siteId });
  const createKey = useMutation(api.siteKeys.create);
  const updateKey = useMutation(api.siteKeys.update);
  const removeKey = useMutation(api.siteKeys.remove);
  const [editing, setEditing] = useState<KeyRow | "NEW" | null>(null);
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string | null>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const filteredKeys = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data?.keys ?? [];
    return (data?.keys ?? []).filter(({ key, assigneeName, assigneeRole }) =>
      [assigneeName, assigneeRole, key.usageWindow, key.keyName, key.keyNumber, key.details, key.code]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [data?.keys, search]);

  if (data === undefined) {
    return <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8"><div className="h-64 animate-pulse rounded-2xl bg-muted" /></div>;
  }

  async function togglePasscode(row: KeyRow) {
    const id = row.key._id;
    if (revealed[id] !== undefined) {
      setRevealed((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    setRevealingId(id);
    try {
      const passcode = await convex.query(api.siteKeys.revealPasscode, { keyId: id });
      setRevealed((current) => ({ ...current, [id]: passcode }));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRevealingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8">
      <Link href={`/dashboard/sites/${siteId}`} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to {data.siteName}
      </Link>

      <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="size-6" /></span>
          <div>
            <p className="label-caps text-primary">{data.siteName}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Key Manager</h1>
            <p className="mt-2 text-sm text-muted-foreground">Allocate and track site keys, cards, access codes and usage windows.</p>
          </div>
        </div>
        <Button className="rounded-xl" onClick={() => setEditing("NEW")} disabled={data.assignees.length === 0}>
          <Plus className="size-4" />Add Key
        </Button>
      </header>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-extrabold">Key and access register</p><p className="mt-1 text-xs text-muted-foreground">{data.keys.length} active {data.keys.length === 1 ? "record" : "records"}</p></div>
          <label className="relative block w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input className="form-input pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search keys or team members" />
          </label>
        </div>

        {data.assignees.length === 0 ? (
          <EmptyState title="No site team members" description="Assign an employee or manager to this site before allocating a key." />
        ) : data.keys.length === 0 ? (
          <EmptyState title="No keys allocated" description="Add the first site key or access card and allocate it to a team member." />
        ) : filteredKeys.length === 0 ? (
          <EmptyState title="No matching keys" description="Try a different search term." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left text-sm">
              <thead className="bg-muted/60 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-5 py-3">Name</th><th className="px-4 py-3">Usage Window</th><th className="px-4 py-3">Key Name</th><th className="px-4 py-3">Key Number</th><th className="px-4 py-3 text-center">Cards / Keys</th><th className="px-4 py-3">Card / Key Details</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Passcode</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredKeys.map((row) => (
                  <tr key={row.key._id} className="align-top hover:bg-muted/30">
                    <td className="px-5 py-4"><p className="font-bold">{row.assigneeName}</p><p className="mt-1 text-xs text-muted-foreground">{roleLabel(row.assigneeRole)}</p></td>
                    <td className="max-w-48 whitespace-pre-wrap px-4 py-4">{row.key.usageWindow}</td>
                    <td className="px-4 py-4 font-semibold">{row.key.keyName}</td>
                    <td className="px-4 py-4 font-mono text-xs">{row.key.keyNumber}</td>
                    <td className="px-4 py-4 text-center font-bold">{row.key.quantity}</td>
                    <td className="max-w-64 whitespace-pre-wrap px-4 py-4 text-muted-foreground">{row.key.details || "—"}</td>
                    <td className="px-4 py-4 font-mono text-xs">{row.key.code || "—"}</td>
                    <td className="px-4 py-4">
                      {row.hasPasscode ? <div className="flex items-center gap-2"><span className="min-w-20 font-mono text-xs">{revealed[row.key._id] ?? "••••••••"}</span><button type="button" disabled={revealingId === row.key._id} onClick={() => void togglePasscode(row)} title={revealed[row.key._id] !== undefined ? "Hide passcode" : "Show passcode"} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">{revealed[row.key._id] !== undefined ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" title={`Edit ${row.key.keyName}`} onClick={() => setEditing(row)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-4" /></button><button type="button" title={`Delete ${row.key.keyName}`} onClick={async () => { if (!window.confirm(`Delete ${row.key.keyName} from the key register?`)) return; try { await removeKey({ keyId: row.key._id }); toast.success("Key record deleted"); } catch (error) { toast.error(errorMessage(error)); } }} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <KeyModal
          row={editing === "NEW" ? undefined : editing}
          assignees={data.assignees}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            const allocation = parseAssignee(values.assignee);
            const fields = {
              usageWindow: values.usageWindow,
              keyName: values.keyName,
              keyNumber: values.keyNumber,
              quantity: values.quantity,
              ...(values.details ? { details: values.details } : {}),
              ...(values.code ? { code: values.code } : {}),
              ...(allocation.kind === "EMPLOYEE" ? { assignedEmployeeId: allocation.id as Id<"employees"> } : { assignedUserId: allocation.id as Id<"users"> }),
            };
            if (editing === "NEW") {
              await createKey({ siteId, ...fields, ...(values.passcode ? { passcode: values.passcode } : {}) });
              toast.success("Key allocated");
            } else {
              await updateKey({ keyId: editing.key._id, ...fields, clearPasscode: values.clearPasscode, ...(values.passcode ? { passcode: values.passcode } : {}) });
              toast.success("Key record updated");
              setRevealed((current) => { const next = { ...current }; delete next[editing.key._id]; return next; });
            }
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function KeyModal({ row, assignees, onClose, onSave }: { row?: KeyRow; assignees: Assignee[]; onClose: () => void; onSave: (values: FormValues) => Promise<void> }) {
  const [fields, setFields] = useState({
    assignee: row ? assigneeValue(row.key) : "",
    usageWindow: row?.key.usageWindow ?? "",
    keyName: row?.key.keyName ?? "",
    keyNumber: row?.key.keyNumber ?? "",
    quantity: row?.key.quantity ?? 1,
    details: row?.key.details ?? "",
    code: row?.key.code ?? "",
    passcode: "",
    clearPasscode: false,
  });
  const [showPasscode, setShowPasscode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...fields,
        usageWindow: fields.usageWindow.trim(),
        keyName: fields.keyName.trim(),
        keyNumber: fields.keyNumber.trim(),
        details: fields.details.trim() || undefined,
        code: fields.code.trim() || undefined,
        passcode: fields.passcode.trim() || undefined,
      });
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="text-xl font-extrabold">{row ? "Edit Key Allocation" : "Add Key Allocation"}</h2><p className="mt-1 text-sm text-muted-foreground">Select an existing team member and record their site access item.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted"><X className="size-5" /></button></div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Allocated team member *"><select required className="form-input" value={fields.assignee} onChange={(event) => setFields((current) => ({ ...current, assignee: event.target.value }))}><option value="">Select from the existing site team</option><optgroup label="Employees and cleaners">{assignees.filter((item) => item.kind === "EMPLOYEE").map((item) => <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>{item.name} — {roleLabel(item.role)}</option>)}</optgroup><optgroup label="Site team accounts">{assignees.filter((item) => item.kind === "USER").map((item) => <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>{item.name} — {roleLabel(item.role)}</option>)}</optgroup></select></Field></div>
          <Field label="Key name *"><input required className="form-input" value={fields.keyName} onChange={(event) => setFields((current) => ({ ...current, keyName: event.target.value }))} placeholder="e.g. Main entrance master key" /></Field>
          <Field label="Key number *"><input required className="form-input" value={fields.keyNumber} onChange={(event) => setFields((current) => ({ ...current, keyNumber: event.target.value }))} placeholder="e.g. KEY-014" /></Field>
          <Field label="Usage window *"><input required className="form-input" value={fields.usageWindow} onChange={(event) => setFields((current) => ({ ...current, usageWindow: event.target.value }))} placeholder="e.g. Mon–Fri, 6:00 pm–10:00 pm" /></Field>
          <Field label="Number of cards / keys *"><input required type="number" min={1} max={999} step={1} className="form-input" value={fields.quantity} onChange={(event) => setFields((current) => ({ ...current, quantity: Number(event.target.value) }))} /></Field>
          <Field label="Code"><input className="form-input font-mono" value={fields.code} onChange={(event) => setFields((current) => ({ ...current, code: event.target.value }))} /></Field>
          <Field label={row?.hasPasscode ? "New passcode (leave blank to keep current)" : "Passcode"}><span className="relative block"><input type={showPasscode ? "text" : "password"} className="form-input pr-11 font-mono" value={fields.passcode} disabled={fields.clearPasscode} onChange={(event) => setFields((current) => ({ ...current, passcode: event.target.value }))} /><button type="button" onClick={() => setShowPasscode((current) => !current)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted" title={showPasscode ? "Hide passcode" : "Show passcode"}>{showPasscode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></Field>
          {row?.hasPasscode && <label className="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={fields.clearPasscode} onChange={(event) => setFields((current) => ({ ...current, clearPasscode: event.target.checked, passcode: event.target.checked ? "" : current.passcode }))} />Remove the saved passcode</label>}
          <div className="sm:col-span-2"><Field label="Card / key details"><textarea className="form-input min-h-24 resize-y py-3" value={fields.details} onChange={(event) => setFields((current) => ({ ...current, details: event.target.value }))} placeholder="Physical description, card type, access areas or return instructions" /></Field></div>
          {error && <p className="sm:col-span-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-5"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : row ? "Save Changes" : "Add Key"}</Button></div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="label-caps text-muted-foreground">{label}</span><span className="mt-2 block">{children}</span></label>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="px-6 py-14 text-center"><KeyRound className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-bold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>; }
function assigneeValue(key: KeyRow["key"]) { return key.assignedEmployeeId ? `EMPLOYEE:${key.assignedEmployeeId}` : key.assignedUserId ? `USER:${key.assignedUserId}` : ""; }
function parseAssignee(value: string) { const [kind, id] = value.split(":"); if ((kind !== "EMPLOYEE" && kind !== "USER") || !id) throw new Error("Select a team member"); return { kind, id } as const; }
function roleLabel(role: string) { return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Something went wrong"; }
