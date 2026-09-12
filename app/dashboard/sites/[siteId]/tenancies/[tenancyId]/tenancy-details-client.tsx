"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { FormEvent, useMemo, useState } from "react";

import { Search, X } from "lucide-react";

import { useMutation } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FileWarning,
  Layers3,
  Mail,
  MapPin,
  MessageSquareWarning,
  NotebookText,
  Phone,
  ShieldAlert,
  UserRound,
  CalendarDays,
  Copy,
  DollarSign,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Tab =
  | "overview"
  | "areas"
  | "work-orders"
  | "complaints"
  | "hazards"
  | "notes"
  | "planner";

type WorkOrderStatus =
  "OPEN" | "QUOTED" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

type WorkOrderItem = Doc<"workOrders">;

type WorkOrderForm = {
  workOrderNumber: string;
  title: string;
  description: string;

  quotedAmount: string;

  resolutionNotes: string;
  internalNotes: string;

  status: WorkOrderStatus;

  date: string;
  time: string;
};

export default function TenancyDetailsClient() {
  const params = useParams<{
    siteId: string;
    tenancyId: string;
  }>();

  const siteId = params.siteId as Id<"sites">;

  const tenancyId = params.tenancyId as Id<"tenancies">;

  const data = useQuery(api.tenancies.getById, {
    tenancyId,
  });

  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (data === undefined) {
    return <PageLoading />;
  }

  if (!data) {
    return null;
  }

  const { tenancy, site, role } = data;

  const canManage =
    role === "SUPER_ADMIN" ||
    role === "AREA_MANAGER" ||
    role === "SITE_MANAGER";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      {/* BACK */}
      <Link
        href={`/dashboard/sites/${siteId}/tenancies`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Tenancies
      </Link>

      {/* HEADER */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="label-caps text-muted-foreground">Tenancy</p>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-[2.5rem]">
                  {tenancy.name}
                </h1>

                <StatusBadge status={tenancy.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-4" />
                  {site.name}
                </span>

                {tenancy.floor && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" />
                    {tenancy.floor}
                  </span>
                )}
              </div>
            </div>

            {canManage && (
              <Button variant="outline" className="rounded-xl">
                Edit Tenancy
              </Button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="overflow-x-auto border-t border-border px-4 sm:px-6">
          <div className="flex min-w-max">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </TabButton>

            <TabButton
              active={activeTab === "areas"}
              onClick={() => setActiveTab("areas")}
            >
              Areas
            </TabButton>

            <TabButton
              active={activeTab === "complaints"}
              onClick={() => setActiveTab("complaints")}
            >
              Complaints
            </TabButton>

            <TabButton
              active={activeTab === "work-orders"}
              onClick={() => setActiveTab("work-orders")}
            >
              Work Orders
            </TabButton>

            <TabButton
              active={activeTab === "hazards"}
              onClick={() => setActiveTab("hazards")}
            >
              Hazards
            </TabButton>

            <TabButton
              active={activeTab === "notes"}
              onClick={() => setActiveTab("notes")}
            >
              Notes
            </TabButton>

            <TabButton
              active={activeTab === "planner"}
              onClick={() => setActiveTab("planner")}
            >
              Periodic Planner
            </TabButton>
          </div>
        </div>
      </section>

      <div className="mt-6">
        {activeTab === "overview" && (
          <OverviewTab tenancy={tenancy} siteName={site.name} />
        )}
        {activeTab === "areas" && (
          <AreasTab tenancyId={tenancyId} canManage={canManage} />
        )}
        {activeTab === "complaints" && <ComplaintsTab tenancyId={tenancyId} />}
        {activeTab === "work-orders" && (
          <WorkOrdersTab
            tenancyId={tenancyId}
            canManage={
              role === "SUPER_ADMIN" ||
              role === "AREA_MANAGER" ||
              role === "SITE_MANAGER" ||
              role === "SUPERVISOR"
            }
          />
        )}{" "}
        {activeTab === "hazards" && <HazardsTab />}
        {activeTab === "notes" && <NotesTab />}
        {activeTab === "planner" && <PlannerTab />}
      </div>
    </div>
  );
}

function OverviewTab({
  tenancy,
  siteName,
}: {
  tenancy: {
    name: string;
    floor?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    description?: string;
  };
  siteName: string;
}) {
  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="label-caps text-muted-foreground">Information</p>

          <h2 className="mt-1 text-xl font-extrabold tracking-tight">
            Tenancy Details
          </h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <InfoItem label="Tenancy" value={tenancy.name} />

            <InfoItem label="Site" value={siteName} />

            <InfoItem
              label="Floor / Location"
              value={tenancy.floor || "Not provided"}
            />

            <InfoItem
              label="Contact"
              value={tenancy.contactName || "Not provided"}
            />
          </div>

          {tenancy.description && (
            <div className="mt-7 border-t border-border pt-6">
              <p className="label-caps text-muted-foreground">Description</p>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {tenancy.description}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="label-caps text-muted-foreground">Contact</p>

          <h2 className="mt-1 text-xl font-extrabold tracking-tight">
            Primary Contact
          </h2>

          <div className="mt-6 space-y-4">
            <ContactRow
              icon={UserRound}
              label="Name"
              value={tenancy.contactName || "Not provided"}
            />

            <ContactRow
              icon={Mail}
              label="Email"
              value={tenancy.contactEmail || "Not provided"}
            />

            <ContactRow
              icon={Phone}
              label="Phone"
              value={tenancy.contactPhone || "Not provided"}
            />
          </div>
        </section>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <OperationalCard icon={Layers3} label="Areas" value="—" />

        <OperationalCard
          icon={MessageSquareWarning}
          label="Open Complaints"
          value="—"
        />

        <OperationalCard icon={AlertTriangle} label="Open Issues" value="—" />

        <OperationalCard icon={ShieldAlert} label="Hazards" value="—" />

        <OperationalCard
          icon={CalendarClock}
          label="Periodic Tasks"
          value="—"
        />
      </section>
    </>
  );
}

type ComplaintStatus = "ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

type ComplaintPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

function ComplaintsTab({ tenancyId }: { tenancyId: Id<"tenancies"> }) {
  const complaints = useQuery(api.complaints.getByTenancy, {
    tenancyId,
  });
  const [selectedComplaintId, setSelectedComplaintId] =
    useState<Id<"tenancyComplaints"> | null>(null);
  const removeComplaint = useMutation(api.complaints.remove);
  const [editingComplaint, setEditingComplaint] =
    useState<Doc<"tenancyComplaints"> | null>(null);
  const createComplaint = useMutation(api.complaints.create);

  const setComplaintStatus = useMutation(api.complaints.setStatus);
  const updateComplaint = useMutation(api.complaints.update);
  const [showModal, setShowModal] = useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<ComplaintStatus>("ALL");

  const filteredComplaints = useMemo(() => {
    if (!complaints) {
      return [];
    }

    const term = search.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const matchesStatus =
        statusFilter === "ALL" || complaint.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [complaint.title, complaint.description, complaint.category]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [complaints, search, statusFilter]);

  if (complaints === undefined) {
    return <div className="h-72 animate-pulse rounded-2xl bg-muted" />;
  }

  const openCount = complaints.filter((item) => item.status === "OPEN").length;

  const inProgressCount = complaints.filter(
    (item) => item.status === "IN_PROGRESS",
  ).length;

  const resolvedCount = complaints.filter(
    (item) => item.status === "RESOLVED" || item.status === "CLOSED",
  ).length;

  async function updateStatus(
    complaintId: Id<"tenancyComplaints">,
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
  ) {
    try {
      await setComplaintStatus({
        complaintId,
        status,
      });

      toast.success("Complaint status updated.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to update complaint.",
      );
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="label-caps text-muted-foreground">
              Service Management
            </p>

            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              Complaints
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Track service complaints, concerns and their resolution.
            </p>
          </div>

          <Button
            onClick={() => {
              setEditingComplaint(null);
              setShowModal(true);
            }}
            className="gap-2 rounded-xl"
          >
            <Plus className="size-4" />
            Add Complaint
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid border-b border-border sm:grid-cols-3">
          <ComplaintMetric label="Open" value={openCount} />

          <ComplaintMetric label="In Progress" value={inProgressCount} />

          <ComplaintMetric label="Resolved" value={resolvedCount} />
        </div>

        {/* Search/filter */}
        <div className="flex flex-col gap-3 border-b border-border px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search complaints..."
              className="form-input pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                "ALL",
                "OPEN",
                "IN_PROGRESS",
                "RESOLVED",
                "CLOSED",
              ] as ComplaintStatus[]
            ).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {formatComplaintStatus(status)}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filteredComplaints.length === 0 ? (
          <EmptyModule
            icon={MessageSquareWarning}
            title={
              complaints.length === 0
                ? "No complaints"
                : "No matching complaints"
            }
            description={
              complaints.length === 0
                ? "Complaints raised for this tenancy will appear here."
                : "Try changing your search or status filter."
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {filteredComplaints.map((complaint) => (
              <ComplaintRow
                key={complaint._id}
                complaint={complaint}
                onStatusChange={updateStatus}
                onOpen={() => setSelectedComplaintId(complaint._id)}
              />
            ))}
          </div>
        )}
      </section>

      {selectedComplaintId && (
        <ComplaintDetailsModal
          complaintId={selectedComplaintId}
          onClose={() => {
            setSelectedComplaintId(null);
          }}
          onEdit={(complaint) => {
            setEditingComplaint(complaint);
            setSelectedComplaintId(null);
            setShowModal(true);
          }}
          onDelete={async (complaint) => {
            const confirmed = window.confirm(
              `Delete complaint "${complaint.title}"?`,
            );

            if (!confirmed) {
              return;
            }

            try {
              await removeComplaint({
                complaintId: complaint._id,
              });

              setSelectedComplaintId(null);

              toast.success("Complaint deleted.");
            } catch (error) {
              console.error("DELETE COMPLAINT ERROR:", error);

              toast.error(
                error instanceof Error
                  ? error.message
                  : "Unable to delete complaint.",
              );
            }
          }}
        />
      )}
      {showModal && (
        <ComplaintFormModal
          tenancyId={tenancyId}
          complaint={editingComplaint}
          onClose={() => {
            setShowModal(false);
            setEditingComplaint(null);
          }}
          onCreate={createComplaint}
          onUpdate={updateComplaint}
        />
      )}
      {showModal && (
        <ComplaintFormModal
          tenancyId={tenancyId}
          complaint={editingComplaint}
          onClose={() => {
            setShowModal(false);
            setEditingComplaint(null);
          }}
          onCreate={createComplaint}
          onUpdate={updateComplaint}
        />
      )}

      {selectedComplaintId && (
        <ComplaintDetailsModal
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onEdit={(complaint) => {
            setEditingComplaint(complaint);

            setSelectedComplaintId(null);

            setShowModal(true);
          }}
          onDelete={async (complaint) => {
            // keep your existing delete code
          }}
        />
      )}
    </>
  );
}

function ComplaintRow({
  complaint,
  onStatusChange,
  onOpen,
}: {
  complaint: Doc<"tenancyComplaints">;

  onStatusChange: (
    id: Id<"tenancyComplaints">,
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
  ) => void;

  onOpen: () => void;
}) {
  return (
    <div className="px-6 py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <MessageSquareWarning className="size-5" />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onOpen} className="text-left">
                <h3 className="font-bold transition-colors hover:text-primary">
                  {complaint.title}
                </h3>
              </button>
              <PriorityBadge priority={complaint.priority} />

              <ComplaintStatusBadge status={complaint.status} />
            </div>

            <button
              type="button"
              onClick={onOpen}
              className="block max-w-3xl text-left"
            >
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {complaint.description}
              </p>
            </button>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {complaint.category && (
                <span className="rounded-md bg-muted px-2 py-1">
                  {complaint.category}
                </span>
              )}

              <span>{formatDate(complaint.createdAt)}</span>
            </div>
          </div>
        </div>

        <select
          value={complaint.status}
          onChange={(event) =>
            onStatusChange(
              complaint._id,
              event.target.value as
                "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
            )
          }
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold outline-none"
        >
          <option value="OPEN">Open</option>

          <option value="IN_PROGRESS">In Progress</option>

          <option value="RESOLVED">Resolved</option>

          <option value="CLOSED">Closed</option>
        </select>
      </div>
    </div>
  );
}

function ComplaintMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b border-border px-6 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="label-caps text-muted-foreground">{label}</p>

      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: ComplaintPriority }) {
  const styles = {
    LOW: "bg-muted text-muted-foreground",

    MEDIUM: "bg-blue-50 text-blue-700",

    HIGH: "bg-amber-50 text-amber-700",

    URGENT: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}

function ComplaintStatusBadge({
  status,
}: {
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
}) {
  const styles = {
    OPEN: "bg-red-50 text-red-700",

    IN_PROGRESS: "bg-amber-50 text-amber-700",

    RESOLVED: "bg-emerald-50 text-emerald-700",

    CLOSED: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}
    >
      {formatComplaintStatus(status)}
    </span>
  );
}

function formatComplaintStatus(status: string) {
  if (status === "ALL") {
    return "All";
  }

  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}
function IssuesTab() {
  return (
    <ModuleShell
      label="Operations"
      title="Issues"
      description="Track operational issues requiring investigation or follow-up."
      buttonLabel="Report Issue"
      icon={AlertTriangle}
    >
      <EmptyModule
        icon={AlertTriangle}
        title="No open issues"
        description="Operational issues reported for this tenancy will appear here."
      />
    </ModuleShell>
  );
}

function HazardsTab() {
  return (
    <ModuleShell
      label="Safety"
      title="Hazards"
      description="Record hazards, risks and corrective actions."
      buttonLabel="Report Hazard"
      icon={ShieldAlert}
    >
      <EmptyModule
        icon={ShieldAlert}
        title="No hazards reported"
        description="Safety hazards reported in this tenancy will appear here."
      />
    </ModuleShell>
  );
}

function NotesTab() {
  return (
    <ModuleShell
      label="Activity"
      title="Tenancy Notes"
      description="Operational notes from managers, supervisors and cleaners."
      buttonLabel="Add Note"
      icon={NotebookText}
    >
      <EmptyModule
        icon={NotebookText}
        title="No notes yet"
        description="Updates and operational notes will appear here."
      />
    </ModuleShell>
  );
}

function PlannerTab() {
  return (
    <ModuleShell
      label="Planning"
      title="Periodic Planner"
      description="Plan recurring cleaning and maintenance activities for this tenancy."
      buttonLabel="Add Periodic Task"
      icon={CalendarClock}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PlannerCard
          title="Carpet Cleaning"
          frequency="Quarterly"
          status="Not configured"
        />

        <PlannerCard
          title="Window Cleaning"
          frequency="Monthly"
          status="Not configured"
        />

        <PlannerCard
          title="Floor Maintenance"
          frequency="Quarterly"
          status="Not configured"
        />

        <PlannerCard
          title="High Dusting"
          frequency="Biannual"
          status="Not configured"
        />

        <PlannerCard
          title="Deep Clean"
          frequency="Annual"
          status="Not configured"
        />
      </div>
    </ModuleShell>
  );
}

function ModuleShell({
  label,
  title,
  description,
  buttonLabel,
  children,
}: {
  label: string;
  title: string;
  description: string;
  buttonLabel: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label-caps text-muted-foreground">{label}</p>

          <h2 className="mt-1 text-xl font-extrabold tracking-tight">
            {title}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        <Button className="gap-2 rounded-xl">
          <Plus className="size-4" />
          {buttonLabel}
        </Button>
      </div>

      {children}
    </section>
  );
}

function EmptyModule({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>

      <p className="mt-4 font-bold">{title}</p>

      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function PlannerCard({
  title,
  frequency,
  status,
}: {
  title: string;
  frequency: string;
  status: string;
}) {
  return (
    <div className="rounded-xl border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ClipboardList className="size-4" />
        </span>

        <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {frequency}
        </span>
      </div>

      <h3 className="mt-5 font-bold">{title}</h3>

      <p className="mt-1 text-sm text-muted-foreground">{status}</p>

      <button className="mt-5 flex items-center gap-1 text-sm font-semibold text-primary">
        Configure
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function OperationalCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>

      <p className="mt-5 text-2xl font-extrabold">{value}</p>

      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-caps text-muted-foreground">{label}</p>

      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>

      <div>
        <p className="text-xs text-muted-foreground">{label}</p>

        <p className="mt-0.5 text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function TabButton({
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
      className={`border-b-2 px-4 py-4 text-sm font-semibold transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ModulePlaceholder({
  icon: Icon,
  title,
  description,
  buttonLabel,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  buttonLabel: string;
}) {
  return (
    <ModuleShell
      label="Tenancy Management"
      title={title}
      description={description}
      buttonLabel={buttonLabel}
      icon={Icon}
    >
      <EmptyModule
        icon={Icon}
        title={`No ${title.toLowerCase()} yet`}
        description={`Items added to ${title.toLowerCase()} will appear here.`}
      />
    </ModuleShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-xs font-bold ${
        status === "ACTIVE"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {status === "ACTIVE" ? "Active" : "Archived"}
    </span>
  );
}

function PageLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      <div className="h-52 animate-pulse rounded-2xl bg-muted" />

      <div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

function AreasTab({
  tenancyId,
  canManage,
}: {
  tenancyId: Id<"tenancies">;
  canManage: boolean;
}) {
  const areas = useQuery(api.areas.getByTenancy, {
    tenancyId,
  });

  const createArea = useMutation(api.areas.create);

  const [showModal, setShowModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    areaType: "",
    floor: "",
    description: "",
  });

  if (areas === undefined) {
    return <div className="h-72 animate-pulse rounded-2xl bg-muted" />;
  }

  function closeModal() {
    if (submitting) return;

    setShowModal(false);
    setError("");

    setForm({
      name: "",
      areaType: "",
      floor: "",
      description: "",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Area name is required.");

      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createArea({
        tenancyId,

        name: form.name.trim(),

        areaType: form.areaType.trim() || undefined,

        floor: form.floor.trim() || undefined,

        description: form.description.trim() || undefined,
      });

      toast.success("Area added.");

      closeModal();
    } catch (err) {
      console.error(err);

      setError(err instanceof Error ? err.message : "Unable to add area.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label-caps text-muted-foreground">
              Cleaning Structure
            </p>

            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              Areas
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Rooms, zones and cleaning locations inside this tenancy.
            </p>
          </div>

          {canManage && (
            <Button
              onClick={() => setShowModal(true)}
              className="gap-2 rounded-xl"
            >
              <Plus className="size-4" />
              Add Area
            </Button>
          )}
        </div>

        {areas.length === 0 ? (
          <EmptyModule
            icon={Layers3}
            title="No areas yet"
            description="Add areas such as Reception, Kitchen, Meeting Rooms or Bathrooms."
          />
        ) : (
          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {areas.map((area) => (
              <div
                key={area._id}
                className="rounded-xl border border-border p-5 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Layers3 className="size-4" />
                  </span>

                  <span
                    className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      area.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {area.status === "ACTIVE" ? "Active" : "Archived"}
                  </span>
                </div>

                <h3 className="mt-5 font-bold">{area.name}</h3>

                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {area.areaType && <p>{area.areaType}</p>}

                  {area.floor && <p>{area.floor}</p>}
                </div>

                {area.description && (
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {area.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && (
        <AreaModal
          form={form}
          setForm={setForm}
          error={error}
          submitting={submitting}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}

function AreaModal({
  form,
  setForm,
  error,
  submitting,
  onClose,
  onSubmit,
}: {
  form: {
    name: string;
    areaType: string;
    floor: string;
    description: string;
  };

  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      areaType: string;
      floor: string;
      description: string;
    }>
  >;

  error: string;
  submitting: boolean;
  onClose: () => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="label-caps text-muted-foreground">
              Cleaning Structure
            </p>

            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              Add Area
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Create a cleaning area inside this tenancy.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="grid gap-5">
            <FormField label="Area Name" required>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Reception"
                className="form-input"
              />
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Area Type">
                <select
                  value={form.areaType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      areaType: event.target.value,
                    }))
                  }
                  className="form-input"
                >
                  <option value="">Select type</option>

                  <option value="RECEPTION">Reception</option>

                  <option value="OFFICE">Office</option>

                  <option value="MEETING_ROOM">Meeting Room</option>

                  <option value="KITCHEN">Kitchen</option>

                  <option value="BATHROOM">Bathroom</option>

                  <option value="COMMON_AREA">Common Area</option>

                  <option value="STORAGE">Storage</option>

                  <option value="OTHER">Other</option>
                </select>
              </FormField>

              <FormField label="Floor / Location">
                <input
                  value={form.floor}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      floor: event.target.value,
                    }))
                  }
                  placeholder="Level 1"
                  className="form-input"
                />
              </FormField>
            </div>

            <FormField label="Description">
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Main customer reception area..."
                rows={4}
                className="form-input min-h-28 resize-none py-3"
              />
            </FormField>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? "Adding..." : "Add Area"}
            </Button>
          </div>
        </form>
      </div>
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

        {required && <span className="ml-1 text-destructive">*</span>}
      </label>

      {children}
    </div>
  );
}

function WorkOrdersTab({
  tenancyId,
  canManage,
}: {
  tenancyId: Id<"tenancies">;
  canManage: boolean;
}) {
  const workOrders = useQuery(api.workOrders.getByTenancy, {
    tenancyId,
  });
  const [complaintSource, setComplaintSource] = useState<WorkOrderItem | null>(
    null,
  );
  const createWorkOrder = useMutation(api.workOrders.create);

  const updateWorkOrder = useMutation(api.workOrders.update);

  const removeWorkOrder = useMutation(api.workOrders.remove);
  const duplicateWorkOrder = useMutation(api.workOrders.duplicate);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<"ALL" | WorkOrderStatus>(
    "ALL",
  );

  const [dateFrom, setDateFrom] = useState("");

  const [dateTo, setDateTo] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingId, setEditingId] = useState<Id<"workOrders"> | null>(null);

  const [selectedWorkOrder, setSelectedWorkOrder] =
    useState<WorkOrderItem | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState<WorkOrderForm>(createEmptyWorkOrderForm());
  const [duplicateTarget, setDuplicateTarget] = useState<WorkOrderItem | null>(
    null,
  );

  const [duplicateNumber, setDuplicateNumber] = useState("");

  const filtered = useMemo(() => {
    if (!workOrders) {
      return [];
    }

    const query = search.trim().toLowerCase();

    return workOrders.filter((workOrder) => {
      if (statusFilter !== "ALL" && workOrder.status !== statusFilter) {
        return false;
      }

      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`).getTime();

        if (workOrder.workOrderDate < from) {
          return false;
        }
      }

      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`).getTime();

        if (workOrder.workOrderDate > to) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      return [
        workOrder.workOrderNumber,
        workOrder.title,
        workOrder.description,
        workOrder.internalNotes,
        workOrder.resolutionNotes,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [workOrders, search, statusFilter, dateFrom, dateTo]);

  if (workOrders === undefined) {
    return <div className="h-96 animate-pulse rounded-2xl bg-muted" />;
  }

  const open = workOrders.filter(
    (workOrder) =>
      workOrder.status === "OPEN" ||
      workOrder.status === "QUOTED" ||
      workOrder.status === "APPROVED",
  ).length;

  const inProgress = workOrders.filter(
    (workOrder) => workOrder.status === "IN_PROGRESS",
  ).length;

  const completed = workOrders.filter(
    (workOrder) => workOrder.status === "COMPLETED",
  ).length;

  function openCreate() {
    setEditingId(null);

    setForm(createEmptyWorkOrderForm());

    setError("");
    setShowModal(true);
  }

  function openEdit(workOrder: WorkOrderItem) {
    const date = new Date(workOrder.workOrderDate);

    setEditingId(workOrder._id);

    setForm({
      workOrderNumber: workOrder.workOrderNumber,

      title: workOrder.title,

      description: workOrder.description,

      quotedAmount:
        workOrder.quotedAmountCents !== undefined
          ? (workOrder.quotedAmountCents / 100).toFixed(2)
          : "",

      resolutionNotes: workOrder.resolutionNotes ?? "",

      internalNotes: workOrder.internalNotes ?? "",

      status: workOrder.status,

      date: toDateInput(date),

      time: toTimeInput(date),
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
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.workOrderNumber.trim()) {
      setError("Work order number is required.");
      return;
    }

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }

    const workOrderDate = new Date(
      `${form.date}T${form.time || "00:00"}`,
    ).getTime();

    if (Number.isNaN(workOrderDate)) {
      setError("Please enter a valid date and time.");
      return;
    }

    let quotedAmountCents: number | undefined;

    if (form.quotedAmount.trim()) {
      const amount = Number(form.quotedAmount);

      if (Number.isNaN(amount) || amount < 0) {
        setError("Please enter a valid quote amount.");
        return;
      }

      quotedAmountCents = Math.round(amount * 100);
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        workOrderNumber: form.workOrderNumber.trim(),

        title: form.title.trim(),

        description: form.description.trim(),

        quotedAmountCents,

        resolutionNotes: form.resolutionNotes.trim() || undefined,

        internalNotes: form.internalNotes.trim() || undefined,

        status: form.status,

        workOrderDate,
      };

      if (editingId) {
        await updateWorkOrder({
          workOrderId: editingId,

          ...payload,
        });

        toast.success("Work order updated.");
      } else {
        await createWorkOrder({
          tenancyId,
          ...payload,
        });

        toast.success("Work order created.");
      }

      closeModal();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Unable to save work order.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(workOrder: WorkOrderItem) {
    const confirmed = window.confirm(
      `Delete work order ${workOrder.workOrderNumber}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await removeWorkOrder({
        workOrderId: workOrder._id,
      });

      if (selectedWorkOrder?._id === workOrder._id) {
        setSelectedWorkOrder(null);
      }

      toast.success("Work order deleted.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to delete work order.",
      );
    }
  }

  async function handleDuplicate() {
    if (!duplicateTarget) {
      return;
    }

    if (!duplicateNumber.trim()) {
      toast.error("New work order number is required.");

      return;
    }

    try {
      await duplicateWorkOrder({
        workOrderId: duplicateTarget._id,

        newWorkOrderNumber: duplicateNumber.trim(),

        workOrderDate: Date.now(),
      });

      toast.success("Work order duplicated.");

      setDuplicateTarget(null);
      setDuplicateNumber("");
      setSelectedWorkOrder(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to duplicate work order.",
      );
    }
  }
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* HEADER */}
        <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="label-caps text-muted-foreground">Operations</p>

            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              Work Orders
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage client work orders, quotations and completion records.
            </p>
          </div>

          {canManage && (
            <Button onClick={openCreate} className="gap-2 rounded-xl">
              <Plus className="size-4" />
              Add Work Order
            </Button>
          )}
        </div>

        {/* METRICS */}
        <div className="grid border-b border-border sm:grid-cols-4">
          <WorkOrderMetric label="Total" value={workOrders.length} />

          <WorkOrderMetric label="Open" value={open} />

          <WorkOrderMetric label="In Progress" value={inProgress} />

          <WorkOrderMetric label="Completed" value={completed} />
        </div>

        {/* FILTERS */}
        <div className="border-b border-border p-6">
          <div className="grid gap-3 xl:grid-cols-[1fr_180px_170px_170px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search WO number, title, description or notes..."
                className="form-input pl-9"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | WorkOrderStatus)
              }
              className="form-input"
            >
              <option value="ALL">All Statuses</option>

              <option value="OPEN">Open</option>

              <option value="QUOTED">Quoted</option>

              <option value="APPROVED">Approved</option>

              <option value="IN_PROGRESS">In Progress</option>

              <option value="COMPLETED">Completed</option>

              <option value="CANCELLED">Cancelled</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="form-input"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="form-input"
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* LIST */}
        {filtered.length === 0 ? (
          <EmptyModule
            icon={ClipboardList}
            title={
              workOrders.length === 0
                ? "No work orders"
                : "No matching work orders"
            }
            description={
              workOrders.length === 0
                ? "Client work orders for this tenancy will appear here."
                : "Try changing your search or filters."
            }
          />
        ) : (
          <>
            <div className="hidden grid-cols-[150px_1fr_140px_130px_130px] gap-4 border-b border-border bg-muted/30 px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground lg:grid">
              <span>Work Order</span>
              <span>Title</span>
              <span>Received</span>
              <span>Quote</span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-border">
              {filtered.map((workOrder: any) => (
                <WorkOrderRow
                  key={workOrder._id}
                  workOrder={workOrder}
                  canManage={canManage}
                  onView={() => setSelectedWorkOrder(workOrder)}
                  onEdit={() => openEdit(workOrder)}
                  onDelete={() => handleDelete(workOrder)}
                />
              ))}
            </div>
          </>
        )}

        {filtered.length > 0 && (
          <div className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
            Showing {filtered.length} of {workOrders.length} work orders
          </div>
        )}
      </section>

      {showModal && (
        <WorkOrderModal
          editing={editingId !== null}
          form={form}
          setForm={setForm}
          error={error}
          submitting={submitting}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}

      {selectedWorkOrder && (
        <WorkOrderDetailsModal
          workOrder={selectedWorkOrder}
          canManage={canManage}

          onClose={() => setSelectedWorkOrder(null)}
          onEdit={() => {
            openEdit(selectedWorkOrder);

            setSelectedWorkOrder(null);
          }}
          onDuplicate={() => {
            setDuplicateTarget(selectedWorkOrder);

            setDuplicateNumber("");
          }}
          onCreateComplaint={() => {
            setComplaintSource(selectedWorkOrder);

            setSelectedWorkOrder(null);
          }}
        />
      )}
      {duplicateTarget && (
        <DuplicateWorkOrderModal
          workOrder={duplicateTarget}
          workOrderNumber={duplicateNumber}
          setWorkOrderNumber={setDuplicateNumber}
          onClose={() => {
            setDuplicateTarget(null);
            setDuplicateNumber("");
          }}
          onDuplicate={handleDuplicate}
        />
      )}
      {complaintSource && (
        <WorkOrderComplaintModal
          tenancyId={tenancyId}
          workOrder={complaintSource}
          onClose={() => setComplaintSource(null)}
        />
      )}
    </>
  );
}

function WorkOrderRow({
  workOrder,
  canManage,
  onView,
  onEdit,
  onDelete,
}: {
  workOrder: WorkOrderItem;

  canManage: boolean;

  onView: () => void;

  onEdit: () => void;

  onDelete: () => void;
}) {
  return (
    <div className="group px-6 py-5 transition-colors hover:bg-muted/30">
      <div className="grid gap-4 lg:grid-cols-[150px_1fr_140px_130px_130px] lg:items-center">
        <button
          type="button"
          onClick={onView}
          className="text-left font-mono text-sm font-bold text-primary hover:underline"
        >
          {workOrder.workOrderNumber}
        </button>

        <button type="button" onClick={onView} className="min-w-0 text-left">
          <p className="truncate font-bold">{workOrder.title}</p>

          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {workOrder.description}
          </p>
        </button>

        <div className="text-sm text-muted-foreground">
          {formatWorkOrderDate(workOrder.workOrderDate)}
        </div>

        <div className="text-sm font-semibold">
          {formatMoney(workOrder.quotedAmountCents)}
        </div>

        <div className="flex items-center justify-between gap-2">
          <WorkOrderStatusBadge status={workOrder.status} />

          {canManage && (
            <div className="flex items-center">
              <button
                type="button"
                title="Edit work order"
                onClick={onEdit}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Pencil className="size-4" />
              </button>

              <button
                type="button"
                title="Delete work order"
                onClick={onDelete}
                className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkOrderModal({
  editing,
  form,
  setForm,
  error,
  submitting,
  onClose,
  onSubmit,
}: {
  editing: boolean;

  form: WorkOrderForm;

  setForm: React.Dispatch<React.SetStateAction<WorkOrderForm>>;

  error: string;

  submitting: boolean;

  onClose: () => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-background px-6 py-5">
          <div>
            <p className="label-caps text-muted-foreground">Operations</p>

            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              {editing ? "Edit Work Order" : "Add Work Order"}
            </h2>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          <div className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Work Order Number" required>
                <input
                  value={form.workOrderNumber}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      workOrderNumber: event.target.value,
                    }))
                  }
                  placeholder="WO-48291"
                  className="form-input"
                />
              </FormField>

              <FormField label="Status" required>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as WorkOrderStatus,
                    }))
                  }
                  className="form-input"
                >
                  <option value="OPEN">Open</option>

                  <option value="QUOTED">Quoted</option>

                  <option value="APPROVED">Approved</option>

                  <option value="IN_PROGRESS">In Progress</option>

                  <option value="COMPLETED">Completed</option>

                  <option value="CANCELLED">Cancelled</option>
                </select>
              </FormField>
            </div>

            <FormField label="Title" required>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Carpet stain removal"
                className="form-input"
              />
            </FormField>

            <div className="grid gap-5 sm:grid-cols-3">
              <FormField label="Date Received" required>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="form-input"
                />
              </FormField>

              <FormField label="Time">
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      time: event.target.value,
                    }))
                  }
                  className="form-input"
                />
              </FormField>

              <FormField label="Quote AUD">
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quotedAmount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        quotedAmount: event.target.value,
                      }))
                    }
                    placeholder="385.00"
                    className="form-input pl-9"
                  />
                </div>
              </FormField>
            </div>

            <FormField label="Description" required>
              <textarea
                rows={5}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Describe the work requested by the client..."
                className="form-input min-h-32 resize-none py-3"
              />
            </FormField>

            <FormField label="Internal Notes">
              <textarea
                rows={4}
                value={form.internalNotes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    internalNotes: event.target.value,
                  }))
                }
                placeholder="Internal operational notes..."
                className="form-input min-h-24 resize-none py-3"
              />
            </FormField>

            <FormField label="Resolution Notes">
              <textarea
                rows={4}
                value={form.resolutionNotes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    resolutionNotes: event.target.value,
                  }))
                }
                placeholder="What was done to resolve or complete the work..."
                className="form-input min-h-24 resize-none py-3"
              />
            </FormField>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editing
                  ? "Save Changes"
                  : "Create Work Order"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
function WorkOrderDetailsModal({
  workOrder,
  canManage,
  onClose,
  onEdit,
  onDuplicate,
  onCreateComplaint,
}: {
  workOrder: WorkOrderItem;

  canManage: boolean;

  onClose: () => void;

  onEdit: () => void;

  onDuplicate: () => void;

  onCreateComplaint: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
              {workOrder.workOrderNumber}
            </p>

            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
              {workOrder.title}
            </h2>

            <div className="mt-3">
              <WorkOrderStatusBadge status={workOrder.status} />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <WorkOrderInfo
              label="Received"
              value={formatFullWorkOrderDate(workOrder.workOrderDate)}
            />

            <WorkOrderInfo
              label="Quote"
              value={formatMoney(workOrder.quotedAmountCents)}
            />

            <WorkOrderInfo
              label="Status"
              value={formatWorkOrderStatus(workOrder.status)}
            />
          </div>

          <WorkOrderTextSection
            label="Description"
            value={workOrder.description}
          />

          <WorkOrderTextSection
            label="Internal Notes"
            value={workOrder.internalNotes}
          />

          <WorkOrderTextSection
            label="Resolution Notes"
            value={workOrder.resolutionNotes}
          />

          <div className="mt-7 flex flex-wrap gap-3 border-t border-border pt-5">
            {canManage && (
              <Button onClick={onEdit} className="gap-2">
                <Pencil className="size-4" />
                Edit
              </Button>
            )}

            {canManage && (
              <Button variant="outline" onClick={onDuplicate} className="gap-2">
                <Copy className="size-4" />
                Duplicate
              </Button>
            )}
            <Button variant="outline" onClick={onCreateComplaint}>
              Create Complaint
            </Button>

            <Button variant="outline" disabled>
              Create Request
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Duplicate, Complaint and Request conversion will be connected next.
          </p>
        </div>
      </div>
    </div>
  );
}

function WorkOrderMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b border-border px-6 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="label-caps text-muted-foreground">{label}</p>

      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const styles: Record<WorkOrderStatus, string> = {
    OPEN: "bg-blue-50 text-blue-700",

    QUOTED: "bg-violet-50 text-violet-700",

    APPROVED: "bg-cyan-50 text-cyan-700",

    IN_PROGRESS: "bg-amber-50 text-amber-700",

    COMPLETED: "bg-emerald-50 text-emerald-700",

    CANCELLED: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}
    >
      {formatWorkOrderStatus(status)}
    </span>
  );
}

function WorkOrderInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="label-caps text-muted-foreground">{label}</p>

      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function WorkOrderTextSection({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="mt-6 border-t border-border pt-5">
      <p className="label-caps text-muted-foreground">{label}</p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
        {value || "No information provided."}
      </p>
    </div>
  );
}

function formatWorkOrderStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(cents?: number) {
  if (cents === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

function formatWorkOrderDate(value: number) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatFullWorkOrderDate(value: number) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDateInput(date: Date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toTimeInput(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");

  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function createEmptyWorkOrderForm(): WorkOrderForm {
  const now = new Date();

  return {
    workOrderNumber: "",
    title: "",
    description: "",
    quotedAmount: "",
    resolutionNotes: "",
    internalNotes: "",
    status: "OPEN",
    date: toDateInput(now),
    time: toTimeInput(now),
  };
}

function DuplicateWorkOrderModal({
  workOrder,
  workOrderNumber,
  setWorkOrderNumber,
  onClose,
  onDuplicate,
}: {
  workOrder: WorkOrderItem;
  workOrderNumber: string;
  setWorkOrderNumber: (value: string) => void;
  onClose: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="label-caps text-muted-foreground">Work Orders</p>

            <h2 className="mt-1 text-xl font-extrabold">
              Duplicate Work Order
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Copy{" "}
              <span className="font-mono font-semibold">
                {workOrder.workOrderNumber}
              </span>{" "}
              into a new work order.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6">
          <FormField label="New Work Order Number" required>
            <input
              autoFocus
              value={workOrderNumber}
              onChange={(event) => setWorkOrderNumber(event.target.value)}
              placeholder="WO-48292"
              className="form-input"
            />
          </FormField>

          <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-bold">{workOrder.title}</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Description, quote and internal notes will be copied.
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              Status will reset to Open. Resolution notes and completion date
              will not be copied.
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button onClick={onDuplicate} className="gap-2">
              <Copy className="size-4" />
              Duplicate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkOrderComplaintModal({
  tenancyId,
  workOrder,
  onClose,
}: {
  tenancyId: Id<"tenancies">;

  workOrder: WorkOrderItem;

  onClose: () => void;
}) {
  const createComplaint = useMutation(api.complaints.create);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [title, setTitle] = useState(workOrder.title);

  const [description, setDescription] = useState(
    `Created from Work Order ${workOrder.workOrderNumber}.\n\n${workOrder.description}`,
  );

  const [category, setCategory] = useState("");

  const [priority, setPriority] = useState<ComplaintPriority>("MEDIUM");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Complaint title is required.");

      return;
    }

    if (!description.trim()) {
      setError("Complaint description is required.");

      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createComplaint({
        tenancyId,

        sourceWorkOrderId: workOrder._id,

        title: title.trim(),

        description: description.trim(),

        category: category.trim() || undefined,

        priority,
      });

      toast.success("Complaint created from work order.");

      onClose();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Unable to create complaint.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="label-caps text-muted-foreground">Work Order</p>

            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              Create Complaint
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              From{" "}
              <span className="font-mono">{workOrder.workOrderNumber}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-5">
            <FormField label="Complaint Title" required>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="form-input"
              />
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Category">
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="form-input"
                >
                  <option value="">Select category</option>

                  <option value="CLEANING_QUALITY">Cleaning Quality</option>

                  <option value="MISSED_SERVICE">Missed Service</option>

                  <option value="DAMAGE">Damage</option>

                  <option value="OTHER">Other</option>
                </select>
              </FormField>

              <FormField label="Priority" required>
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as ComplaintPriority)
                  }
                  className="form-input"
                >
                  <option value="LOW">Low</option>

                  <option value="MEDIUM">Medium</option>

                  <option value="HIGH">High</option>

                  <option value="URGENT">Urgent</option>
                </select>
              </FormField>
            </div>

            <FormField label="Description" required>
              <textarea
                rows={6}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="form-input min-h-36 resize-none py-3"
              />
            </FormField>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Complaint"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
function ComplaintDetailsModal({
  complaintId,
  onClose,
  onEdit,
  onDelete,
}: {
  complaintId: Id<"tenancyComplaints">;

  onClose: () => void;

  onEdit: (complaint: Doc<"tenancyComplaints">) => void;

  onDelete: (complaint: Doc<"tenancyComplaints">) => void;
}) {
  const data = useQuery(api.complaints.getById, {
    complaintId,
  });

  const comments = useQuery(api.complaintComments.getByComplaint, {
    complaintId,
  });

  const createComment = useMutation(api.complaintComments.create);

  const removeComment = useMutation(api.complaintComments.remove);

  const setComplaintStatus = useMutation(api.complaints.setStatus);

  const [comment, setComment] = useState("");

  const [submittingComment, setSubmittingComment] = useState(false);

  if (data === undefined || comments === undefined) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
        <div className="rounded-xl bg-background p-8">Loading complaint...</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { complaint, createdBy, sourceWorkOrder } = data;

  async function handleAddComment() {
    if (!comment.trim()) {
      return;
    }

    try {
      setSubmittingComment(true);

      await createComment({
        complaintId,
        content: comment.trim(),
      });

      setComment("");

      toast.success("Comment added.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to add comment.",
      );
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId: Id<"complaintComments">) {
    const confirmed = window.confirm("Delete this comment?");

    if (!confirmed) {
      return;
    }

    try {
      await removeComment({
        commentId,
      });

      toast.success("Comment deleted.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to delete comment.",
      );
    }
  }

  async function handleStatusChange(
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
  ) {
    try {
      await setComplaintStatus({
        complaintId: complaint._id,
        status,
      });

      toast.success("Complaint status updated.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to update status.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-background px-6 py-5">
          <div>
            <p className="label-caps text-muted-foreground">Complaint</p>

            <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
              {complaint.title}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={complaint.priority} />

              <ComplaintStatusBadge status={complaint.status} />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px]">
          {/* Main */}
          <div className="border-b border-border p-6 lg:border-b-0 lg:border-r">
            <p className="label-caps text-muted-foreground">Description</p>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
              {complaint.description}
            </p>

            {sourceWorkOrder && (
              <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
                <p className="label-caps text-muted-foreground">
                  Source Work Order
                </p>

                <p className="mt-2 font-mono text-sm font-bold text-primary">
                  {sourceWorkOrder.workOrderNumber}
                </p>

                <p className="mt-1 text-sm">{sourceWorkOrder.title}</p>
              </div>
            )}

            {/* COMMENTS */}
            <div className="mt-8 border-t border-border pt-6">
              <div>
                <p className="label-caps text-muted-foreground">Activity</p>

                <h3 className="mt-1 text-lg font-extrabold">
                  Comments & Notes
                </h3>
              </div>

              <div className="mt-5 flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  YOU
                </div>

                <div className="flex-1">
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={3}
                    placeholder="Add an update, note or comment..."
                    className="form-input min-h-24 resize-none py-3"
                  />

                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      disabled={submittingComment || !comment.trim()}
                      onClick={handleAddComment}
                    >
                      {submittingComment ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {comments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
                    <p className="text-sm font-semibold">No comments yet</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Updates added by the team will appear here.
                    </p>
                  </div>
                ) : (
                  comments.map((item: any) => {
                    const name =
                      [item.author?.firstName, item.author?.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                      item.author?.email ||
                      "Team Member";

                    return (
                      <div key={item._id} className="flex gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {getCommentInitials(
                            item.author?.firstName,
                            item.author?.lastName,
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="rounded-2xl bg-muted/60 px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold">{name}</p>

                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {formatComplaintDateTime(item.createdAt)}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteComment(item._id)}
                                title="Delete comment"
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>

                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                              {item.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="p-6">
            <p className="label-caps text-muted-foreground">
              Complaint Details
            </p>

            <div className="mt-5 space-y-5">
              <ComplaintInfo
                label="Category"
                value={
                  complaint.category
                    ? formatComplaintStatus(complaint.category)
                    : "Not provided"
                }
              />

              <ComplaintInfo label="Priority" value={complaint.priority} />

              <ComplaintInfo
                label="Created"
                value={formatComplaintDateTime(complaint.createdAt)}
              />

              <ComplaintInfo
                label="Created By"
                value={
                  [createdBy?.firstName, createdBy?.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                  createdBy?.email ||
                  "Unknown"
                }
              />

              {complaint.resolvedAt && (
                <ComplaintInfo
                  label="Resolved"
                  value={formatComplaintDateTime(complaint.resolvedAt)}
                />
              )}
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <FormField label="Status">
                <select
                  value={complaint.status}
                  onChange={(event) =>
                    handleStatusChange(
                      event.target.value as
                        "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
                    )
                  }
                  className="form-input"
                >
                  <option value="OPEN">Open</option>

                  <option value="IN_PROGRESS">In Progress</option>

                  <option value="RESOLVED">Resolved</option>

                  <option value="CLOSED">Closed</option>
                </select>
              </FormField>
            </div>

            <div className="mt-6 grid gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onEdit(complaint)}
                className="justify-start gap-2"
              >
                <Pencil className="size-4" />
                Edit Complaint
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const confirmed = window.confirm(
                    `Are you sure you want to delete "${complaint.title}"?`,
                  );

                  if (!confirmed) {
                    return;
                  }

                  onDelete(complaint);
                }}
                className="justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
                Delete Complaint
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
function ComplaintInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-caps text-muted-foreground">{label}</p>

      <p className="mt-1.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function getCommentInitials(firstName?: string, lastName?: string) {
  const initials = `${firstName?.charAt(0) ?? ""}${
    lastName?.charAt(0) ?? ""
  }`.toUpperCase();

  return initials || "?";
}

function formatComplaintDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function ComplaintFormModal({
  tenancyId,
  complaint,
  onClose,
  onCreate,
  onUpdate,
}: {
  tenancyId: Id<"tenancies">;

  complaint: Doc<"tenancyComplaints"> | null;

  onClose: () => void;

  onCreate: ReturnType<typeof useMutation<typeof api.complaints.create>>;

  onUpdate: ReturnType<typeof useMutation<typeof api.complaints.update>>;
}) {
  const editing = complaint !== null;

  const [title, setTitle] = useState(complaint?.title ?? "");

  const [description, setDescription] = useState(complaint?.description ?? "");

  const [category, setCategory] = useState(complaint?.category ?? "");

  const [priority, setPriority] = useState<ComplaintPriority>(
    complaint?.priority ?? "MEDIUM",
  );

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Complaint title is required.");
      return;
    }

    if (!description.trim()) {
      setError("Complaint description is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      if (editing) {
        await onUpdate({
          complaintId: complaint._id,

          title: title.trim(),

          description: description.trim(),

          category: category.trim() || undefined,

          priority,
        });

        toast.success("Complaint updated.");
      } else {
        await onCreate({
          tenancyId,

          title: title.trim(),

          description: description.trim(),

          category: category.trim() || undefined,

          priority,
        });

        toast.success("Complaint created.");
      }

      onClose();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Unable to save complaint.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-background shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <p className="label-caps text-muted-foreground">
              Service Management
            </p>

            <h2 className="mt-1 text-xl font-extrabold tracking-tight">
              {editing ? "Edit Complaint" : "Add Complaint"}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {editing
                ? "Update the complaint details."
                : "Record a new complaint for this tenancy."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-5">
            <FormField label="Complaint Title" required>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Cleaning service missed"
                className="form-input"
              />
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Category">
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="form-input"
                >
                  <option value="">Select category</option>

                  <option value="CLEANING_QUALITY">Cleaning Quality</option>

                  <option value="MISSED_SERVICE">Missed Service</option>

                  <option value="STAFF_CONDUCT">Staff Conduct</option>

                  <option value="SUPPLIES">Supplies</option>

                  <option value="DAMAGE">Damage</option>

                  <option value="OTHER">Other</option>
                </select>
              </FormField>

              <FormField label="Priority" required>
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as ComplaintPriority)
                  }
                  className="form-input"
                >
                  <option value="LOW">Low</option>

                  <option value="MEDIUM">Medium</option>

                  <option value="HIGH">High</option>

                  <option value="URGENT">Urgent</option>
                </select>
              </FormField>
            </div>

            <FormField label="Description" required>
              <textarea
                rows={6}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the complaint..."
                className="form-input min-h-36 resize-none py-3"
              />
            </FormField>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editing
                  ? "Save Changes"
                  : "Create Complaint"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
