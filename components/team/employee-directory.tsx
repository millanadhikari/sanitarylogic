"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Plus, Search, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { EmployeeForm, type EmployeeFields } from "./employee-form";
import { OnboardingTemplateSettings } from "./onboarding-template-settings";

export function EmployeeDirectory({ siteId }: { siteId?: Id<"sites"> }) {
  const data = useQuery(api.employees.list, { siteId });
  const sites = useQuery(api.sites.getMySites);
  const candidates = useQuery(api.employees.assignmentCandidates, siteId && data?.canCreate ? { siteId } : "skip");
  const createEmployee = useMutation(api.employees.create);
  const assignEmployee = useMutation(api.employees.assignSite);
  const removeAssignment = useMutation(api.employees.removeSiteAssignment);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const filtered = useMemo(() => (data?.employees ?? []).filter((employee) => {
    const haystack = `${employee.firstName} ${employee.lastName} ${employee.employeeNumber ?? ""} ${employee.email ?? ""} ${employee.jobTitle ?? ""}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase()) && (status === "ALL" || employee.status === status);
  }), [data, search, status]);
  if (data === undefined || sites === undefined) return <div className="h-48 animate-pulse rounded-2xl bg-muted" />;
  return <div className="space-y-6"><section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    <div className="flex flex-col gap-4 border-b p-6 lg:flex-row lg:items-center lg:justify-between">
      <div><h2 className="text-xl font-extrabold">{siteId ? "Site Employees" : "Employee & Cleaner Directory"}</h2><p className="mt-1 text-sm text-muted-foreground">{data.employees.length} workforce records</p></div>
      {data.canCreate && <div className="flex flex-wrap gap-2">{siteId && <Button variant="outline" onClick={() => setShowAssign(true)}>Assign Existing</Button>}<Button onClick={() => setShowCreate(true)}><Plus className="size-4" />Add Cleaner / Employee</Button></div>}
    </div>
    <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_190px]">
      <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="form-input search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, number, email or title…" /></label>
      <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="TERMINATED">Terminated</option></select>
    </div>
    {filtered.length === 0 ? <div className="p-12 text-center"><Users className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-bold">No employees found</p></div> : <div className="max-h-[520px] overflow-auto"><table className="w-full min-w-[760px] text-sm">
      <thead className="sticky top-0 z-10 bg-muted"><tr>{["Employee", "Type", "Sites", "Contact", "Status", "Actions"].map((x) => <th key={x} className="px-5 py-3 text-left font-bold">{x}</th>)}</tr></thead>
      <tbody className="divide-y">{filtered.map((employee) => <tr key={employee._id} className="hover:bg-muted/30">
        <td className="px-5 py-4"><p className="font-bold">{employee.firstName} {employee.lastName}</p><p className="text-xs text-muted-foreground">{employee.employeeNumber ?? employee.jobTitle ?? "No employee number"}</p></td>
        <td className="px-5 py-4">{employee.employmentType.replaceAll("_", " ")}</td>
        <td className="px-5 py-4">{employee.siteAssignments.map((x) => x.siteName).join(", ") || "Unassigned"}</td>
        <td className="px-5 py-4">{employee.email ?? employee.phone ?? "—"}</td>
        <td className="px-5 py-4"><span className="rounded-md bg-muted px-2 py-1 text-xs font-bold">{employee.status}</span></td>
        <td className="px-5 py-4"><div className="flex items-center gap-3"><Link className="font-bold text-primary" href={`/dashboard/team/employees/${employee._id}`}>View</Link>{siteId && data.canCreate && employee.siteAssignments[0] && <button className="font-bold text-destructive" onClick={async () => { if (!confirm(`Remove ${employee.firstName} from this site?`)) return; await removeAssignment({ assignmentId: employee.siteAssignments[0]._id }); toast.success("Employee removed from site"); }}>Remove</button>}</div></td>
      </tr>)}</tbody>
    </table></div>}
    {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background shadow-xl">
      <div className="flex items-center justify-between border-b p-6"><div><h2 className="text-xl font-extrabold">Add Cleaner / Employee</h2><p className="text-sm text-muted-foreground">This creates a workforce record only. It does not create a login.</p></div><button onClick={() => setShowCreate(false)}><X /></button></div>
      <div className="p-6"><EmployeeForm sites={sites} initialSiteId={siteId} showSite={!siteId} onCancel={() => setShowCreate(false)} onSubmit={async (fields: EmployeeFields, selectedSiteId) => {
        await createEmployee({ ...fields, siteId: siteId ?? selectedSiteId, assignmentRole: (siteId ?? selectedSiteId) ? "CLEANER" : undefined });
        toast.success("Employee created"); setShowCreate(false);
      }} /></div>
    </div></div>}
    {showAssign && siteId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-background shadow-xl"><div className="flex items-center justify-between border-b p-5"><div><h2 className="text-xl font-extrabold">Assign Existing Employee</h2><p className="text-sm text-muted-foreground">No duplicate employee record will be created.</p></div><button onClick={() => setShowAssign(false)}><X /></button></div><div className="space-y-4 p-6">{candidates === undefined ? <div className="h-12 animate-pulse rounded-xl bg-muted" /> : candidates.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">No other active employees are available.</p> : <select className="form-input" value={candidateId} onChange={(e) => setCandidateId(e.target.value)}><option value="">Select employee</option>{candidates.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.firstName} {employee.lastName}{employee.employeeNumber ? ` · ${employee.employeeNumber}` : ""}</option>)}</select>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button><Button disabled={!candidateId} onClick={async () => { await assignEmployee({ employeeId: candidateId as Id<"employees">, siteId, assignmentRole: "CLEANER", isPrimarySite: false }); toast.success("Employee assigned to site"); setCandidateId(""); setShowAssign(false); }}>Assign Employee</Button></div></div></div></div>}
  </section>{!siteId && data.role === "SUPER_ADMIN" && <OnboardingTemplateSettings companyId={data.companyId} />}</div>;
}
