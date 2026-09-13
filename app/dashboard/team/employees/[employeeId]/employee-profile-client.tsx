"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Camera, CheckCircle2, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { EmployeeForm, type EmployeeFields } from "@/components/team/employee-form";

type Tab = "OVERVIEW" | "SITES" | "ONBOARDING";
export default function EmployeeProfileClient() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const id = employeeId as Id<"employees">;
  const data = useQuery(api.employees.getById, { employeeId: id });
  const sites = useQuery(api.sites.getMySites);
  const update = useMutation(api.employees.update);
  const setStatus = useMutation(api.employees.setStatus);
  const assign = useMutation(api.employees.assignSite);
  const removeAssignment = useMutation(api.employees.removeSiteAssignment);
  const generateUploadUrl = useMutation(api.employees.generateUploadUrl);
  const setProfileImage = useMutation(api.employees.setProfileImage);
  const updateOnboarding = useMutation(api.onboarding.updateEmployeeItem);
  const [tab, setTab] = useState<Tab>("OVERVIEW");
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [siteId, setSiteId] = useState("");
  const [uploading, setUploading] = useState(false);
  if (data === undefined || sites === undefined) return <div className="p-8"><div className="h-56 animate-pulse rounded-2xl bg-muted" /></div>;
  if (!data) return null;
  const employee = data.employee;
  async function upload(file?: File) {
    if (!file) return; setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({ employeeId: id });
      const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error("Photo upload failed");
      const result = await response.json() as { storageId: Id<"_storage"> };
      await setProfileImage({ employeeId: id, storageId: result.storageId }); toast.success("Profile photo updated");
    } catch (error) { toast.error(message(error)); } finally { setUploading(false); }
  }
  return <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
    <Link href="/dashboard/team" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Back to Team</Link>
    <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-5">
          <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-2xl font-extrabold text-primary">
            {employee.profileImageUrl ? <Image src={employee.profileImageUrl} alt={`${employee.firstName} ${employee.lastName}`} fill unoptimized className="object-cover" /> : <>{employee.firstName[0]}{employee.lastName[0]}</>}
          </div>
          <div><p className="label-caps text-muted-foreground">Employee profile</p><h1 className="mt-2 text-3xl font-extrabold">{employee.firstName} {employee.lastName}</h1><p className="mt-2 text-muted-foreground">{employee.jobTitle ?? employee.employmentType.replaceAll("_", " ")} · {employee.employeeNumber ?? "No employee number"}</p><span className="mt-3 inline-block rounded-md bg-muted px-2 py-1 text-xs font-bold">{employee.status}</span></div>
        </div>
        {data.canEdit && <div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-bold"><Camera className="size-4" />{uploading ? "Uploading…" : "Photo"}<input className="hidden" type="file" accept="image/*" disabled={uploading} onChange={(e) => upload(e.target.files?.[0])} /></label><Button variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" />Edit</Button></div>}
      </div>
      <div className="mt-7 flex gap-1 border-t pt-2">{(["OVERVIEW", "SITES", "ONBOARDING"] as Tab[]).map((value) => <button key={value} onClick={() => setTab(value)} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === value ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{value[0] + value.slice(1).toLowerCase()}</button>)}</div>
    </section>
    {tab === "OVERVIEW" && <section className="mt-6 grid gap-6 lg:grid-cols-2"><Card title="Employment"><Info label="Employment type" value={employee.employmentType.replaceAll("_", " ")} /><Info label="Start date" value={employee.startDate ? new Date(employee.startDate).toLocaleDateString("en-AU") : undefined} /><Info label="Email" value={employee.email} /><Info label="Phone" value={employee.phone} /></Card><Card title="Personal & emergency"><Info label="Address" value={[employee.address, employee.suburb, employee.state, employee.postcode].filter(Boolean).join(", ")} /><Info label="Emergency contact" value={employee.emergencyContactName} /><Info label="Relationship" value={employee.emergencyContactRelationship} /><Info label="Emergency phone" value={employee.emergencyContactPhone} /><Info label="Notes" value={employee.notes} /></Card>
      {data.canSetCompanyStatus && <div className="lg:col-span-2 flex flex-wrap gap-2 rounded-2xl border bg-card p-5"><span className="mr-auto font-bold">Company employment status</span>{(["ACTIVE", "INACTIVE", "TERMINATED"] as const).map((status) => <Button key={status} size="sm" variant={employee.status === status ? "default" : "outline"} onClick={async () => { if (status === "TERMINATED" && !confirm("Mark this employee as terminated?")) return; await setStatus({ employeeId: id, status }); toast.success("Employee status updated"); }}>{status.replaceAll("_", " ")}</Button>)}</div>}
    </section>}
    {tab === "SITES" && <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="flex items-center justify-between border-b p-5"><div><h2 className="text-xl font-extrabold">Site assignments</h2><p className="text-sm text-muted-foreground">Removing a site does not archive the employee.</p></div>{data.canEdit && <Button onClick={() => setAssigning(true)}><Plus className="size-4" />Assign site</Button>}</div><div className="divide-y">{employee.siteAssignments.length === 0 ? <p className="p-8 text-center text-muted-foreground">No active site assignments</p> : employee.siteAssignments.map((assignment) => <div key={assignment._id} className="flex items-center justify-between gap-3 p-5"><div><p className="flex items-center gap-2 font-bold"><MapPin className="size-4 text-primary" />{assignment.siteName}</p><p className="mt-1 text-xs text-muted-foreground">{assignment.assignmentRole} {assignment.isPrimarySite ? "· Primary site" : ""}</p></div>{data.canEdit && <Button variant="outline" size="sm" onClick={async () => { if (!confirm(`Remove ${employee.firstName} from ${assignment.siteName}?`)) return; await removeAssignment({ assignmentId: assignment._id }); toast.success("Site assignment removed"); }}><Trash2 className="size-4" />Remove</Button>}</div>)}</div></section>}
    {tab === "ONBOARDING" && <section className="mt-6 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-6"><h2 className="text-xl font-extrabold">Onboarding checklist</h2><p className="mt-1 text-sm text-muted-foreground">A separate snapshot copied from the company template.</p><div className="mt-5 space-y-2">{data.onboardingItems.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No onboarding checklist was active when this employee was created.</p> : data.onboardingItems.map((item) => <div key={item._id} className="grid min-w-0 gap-3 rounded-xl border p-4 sm:grid-cols-[auto_minmax(0,1fr)_11rem] sm:items-center"><CheckCircle2 className={`size-5 shrink-0 ${item.status === "COMPLETED" ? "text-primary" : "text-muted-foreground"}`} /><div className="min-w-0"><p className="break-words font-bold leading-5">{item.title}</p><p className="mt-1 break-words text-xs text-muted-foreground">{item.required ? "Required" : "Optional"}{item.completedAt ? ` · Completed ${new Date(item.completedAt).toLocaleDateString("en-AU")}` : ""}</p></div>{data.canEdit ? <select className="form-input min-w-0 w-full text-sm" value={item.status} onChange={async (e) => { try { await updateOnboarding({ itemId: item._id, status: e.target.value as "PENDING" | "COMPLETED" | "NOT_APPLICABLE", ...(item.notes ? { notes: item.notes } : {}) }); toast.success("Checklist updated"); } catch (error) { toast.error(message(error)); } }}><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="NOT_APPLICABLE">Not applicable</option></select> : <span className="break-words text-xs font-bold sm:text-right">{item.status.replaceAll("_", " ")}</span>}</div>)}</div></section>}
    {editing && <Modal title="Edit employee" onClose={() => setEditing(false)}><EmployeeForm initial={employee} submitLabel="Update Employee" onCancel={() => setEditing(false)} onSubmit={async (fields: EmployeeFields) => { await update({ employeeId: id, ...fields }); toast.success("Employee updated"); setEditing(false); }} /></Modal>}
    {assigning && <Modal title="Assign employee to site" onClose={() => setAssigning(false)}><div className="space-y-4"><select className="form-input" value={siteId} onChange={(e) => setSiteId(e.target.value)}><option value="">Select a site</option>{sites.map((site) => <option key={site._id} value={site._id}>{site.name}</option>)}</select><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAssigning(false)}>Cancel</Button><Button disabled={!siteId} onClick={async () => { await assign({ employeeId: id, siteId: siteId as Id<"sites">, assignmentRole: "CLEANER", isPrimarySite: employee.siteAssignments.length === 0 }); toast.success("Site assigned"); setAssigning(false); setSiteId(""); }}>Assign</Button></div></div></Modal>}
  </main>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border bg-card p-6 shadow-sm"><h2 className="text-xl font-extrabold">{title}</h2><div className="mt-5 space-y-4">{children}</div></section>; }
function Info({ label, value }: { label: string; value?: string }) { return <div><p className="label-caps text-muted-foreground">{label}</p><p className="mt-1 text-sm">{value || "Not provided"}</p></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background"><div className="flex justify-between border-b p-5"><h2 className="text-xl font-extrabold">{title}</h2><button onClick={onClose}><X /></button></div><div className="p-6">{children}</div></div></div>; }
function message(error: unknown) { return error instanceof Error ? error.message : "Something went wrong"; }
