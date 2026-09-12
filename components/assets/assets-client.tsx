"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, FileDown, Plus, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { downloadTablePdf } from "./pdf-report";
type Status = Doc<"assets">["status"];
type ReportType = "ASSETS" | "TEST_TAG" | "MAINTENANCE";
const STATUSES: Status[] = ["ACTIVE", "OUT_OF_SERVICE", "DISPOSED", "ARCHIVED"];
export default function AssetsClient() {
  const { siteId: raw } = useParams<{ siteId: string }>();
  const siteId = raw as Id<"sites">;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const data = useQuery(api.assets.list, { siteId, today });
  const create = useMutation(api.assets.create);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("ASSETS");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const report = useQuery(
    api.assets.reportData,
    reportOpen
      ? {
          siteId,
          reportType,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }
      : "skip",
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [category, setCategory] = useState("");
  const [modal, setModal] = useState(false);
  const items = useMemo(
    () =>
      data?.items.filter(({ asset }) => {
        const hay = [
          asset.assetName,
          asset.assetCode,
          asset.serialNumber,
          asset.manufacturer,
          asset.model,
          asset.location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          (!search || hay.includes(search.toLowerCase())) &&
          (!status || asset.status === status) &&
          (!category || asset.category === category)
        );
      }) ?? [],
    [data, search, status, category],
  );
  const categories = [
    ...new Set(
      (data?.items ?? []).map((x) => x.asset.category).filter(Boolean),
    ),
  ] as string[];
  if (!data)
    return (
      <div className="p-8">
        <div className="h-52 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  async function submit(fields: AssetFields) {
    try {
      await create({ siteId, ...fields });
      toast.success("Asset added");
      setModal(false);
    } catch (error) {
      toast.error(message(error));
    }
  }
  function pdf() {
    if (!report) return;
    const assetById = new Map(
      report.assets.map((asset: Doc<"assets">) => [asset._id, asset]),
    );
    if (reportType === "TEST_TAG") {
      downloadTablePdf(
        "Test and Tag Register Report",
        report.companyName,
        report.site.name,
        [
          "Asset",
          "Serial Number",
          "Test Date",
          "Result",
          "Tag Number",
          "Tester",
          "Next Due",
        ],
        report.tests.map((row: Doc<"assetTestAndTagRecords">) => {
          const asset = assetById.get(row.assetId);
          return [
            asset?.assetName ?? "",
            asset?.serialNumber ?? "",
            reportDate(row.testDate),
            row.result.replaceAll("_", " "),
            row.tagNumber ?? "",
            [row.testedByName, row.testerCompany].filter(Boolean).join(" / "),
            row.nextTestDueDate ? reportDate(row.nextTestDueDate) : "",
          ];
        }),
        [
          fromDate && `From: ${reportDate(fromDate)}`,
          toDate && `To: ${reportDate(toDate)}`,
        ].filter(Boolean) as string[],
        [
          ["Total Records", report.tests.length],
          [
            "Pass",
            report.tests.filter(
              (row: Doc<"assetTestAndTagRecords">) => row.result === "PASS",
            ).length,
          ],
          [
            "Fail",
            report.tests.filter(
              (row: Doc<"assetTestAndTagRecords">) => row.result === "FAIL",
            ).length,
          ],
          [
            "Requires Action",
            report.tests.filter(
              (row: Doc<"assetTestAndTagRecords">) =>
                row.result === "REQUIRES_ACTION",
            ).length,
          ],
          [
            "Due / Overdue",
            report.tests.filter(
              (row: Doc<"assetTestAndTagRecords">) =>
                row.nextTestDueDate &&
                row.nextTestDueDate <= addReportDays(today, 30),
            ).length,
          ],
        ],
      );
      return;
    }
    if (reportType === "MAINTENANCE") {
      downloadTablePdf(
        "Maintenance Register Report",
        report.companyName,
        report.site.name,
        [
          "Asset",
          "Serial Number",
          "Maintenance Date",
          "Type",
          "Description",
          "Provider",
          "Cost",
          "Next Due",
          "Status",
        ],
        report.maintenance.map((row: Doc<"assetMaintenanceRecords">) => {
          const asset = assetById.get(row.assetId);
          return [
            asset?.assetName ?? "",
            asset?.serialNumber ?? "",
            reportDate(row.maintenanceDate),
            row.maintenanceType,
            row.description,
            [row.serviceProvider, row.technicianName]
              .filter(Boolean)
              .join(" / "),
            row.costCents === undefined
              ? ""
              : `$${(row.costCents / 100).toFixed(2)}`,
            row.nextMaintenanceDueDate
              ? reportDate(row.nextMaintenanceDueDate)
              : "",
            row.status.replaceAll("_", " "),
          ];
        }),
        [
          fromDate && `From: ${reportDate(fromDate)}`,
          toDate && `To: ${reportDate(toDate)}`,
        ].filter(Boolean) as string[],
        [
          ["Total Records", report.maintenance.length],
          [
            "Completed",
            report.maintenance.filter(
              (row: Doc<"assetMaintenanceRecords">) =>
                row.status === "COMPLETED",
            ).length,
          ],
          [
            "Requires Follow-up",
            report.maintenance.filter(
              (row: Doc<"assetMaintenanceRecords">) =>
                row.status === "REQUIRES_FOLLOW_UP",
            ).length,
          ],
          [
            "Due / Overdue",
            report.maintenance.filter(
              (row: Doc<"assetMaintenanceRecords">) =>
                row.nextMaintenanceDueDate &&
                row.nextMaintenanceDueDate <= addReportDays(today, 30),
            ).length,
          ],
        ],
      );
      return;
    }
    downloadTablePdf(
      "Asset Register Report",
      report.companyName,
      report.site.name,
      [
        "Asset",
        "Asset Code",
        "Category",
        "Manufacturer / Model",
        "Serial Number",
        "Location",
        "Status",
      ],
      report.assets.map((a: Doc<"assets">) => [
        a.assetName,
        a.assetCode ?? "",
        a.category ?? "",
        [a.manufacturer, a.model].filter(Boolean).join(" / "),
        a.serialNumber ?? "",
        a.location ?? "",
        a.status,
      ]),
      [
        status && `Status: ${status.replaceAll("_", " ")}`,
        category && `Category: ${category}`,
      ].filter(Boolean) as string[],
      [
        ["Total Assets", report.assets.length],
        [
          "Active",
          report.assets.filter(
            (asset: Doc<"assets">) => asset.status === "ACTIVE",
          ).length,
        ],
        [
          "Out of Service",
          report.assets.filter(
            (asset: Doc<"assets">) => asset.status === "OUT_OF_SERVICE",
          ).length,
        ],
        [
          "Disposed / Archived",
          report.assets.filter(
            (asset: Doc<"assets">) =>
              asset.status === "DISPOSED" || asset.status === "ARCHIVED",
          ).length,
        ],
      ],
    );
  }
  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8">
      <Link
        href={`/dashboard/sites/${siteId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to {data.site.name}
      </Link>
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="label-caps text-muted-foreground">{data.site.name}</p>
            <h1 className="mt-2 text-3xl font-extrabold">Assets</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage Site assets, Test &amp; Tag compliance and maintenance
              records.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReportOpen(true)}>
              <FileDown className="size-4" />
              Reports
            </Button>
            {data.canManage && (
              <Button onClick={() => setModal(true)}>
                <Plus className="size-4" />
                Add Asset
              </Button>
            )}
          </div>
        </div>
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Assets" value={data.summary.total} />
        <Metric label="Active Assets" value={data.summary.active} />
        <Metric label="Test & Tag Due / Overdue" value={data.summary.testDue} />
        <Metric
          label="Maintenance Due / Overdue"
          value={data.summary.maintenanceDue}
        />
      </section>
      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid gap-3 border-b border-border p-5 md:grid-cols-3">
          <input
            className="form-input"
            placeholder="Search assets"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | "")}
          >
            <option value="">All statuses</option>
            {STATUSES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            className="form-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        {items.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No assets match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {[
                    "Asset",
                    "Category",
                    "Serial Number",
                    "Location",
                    "Test & Tag",
                    "Maintenance",
                    "Status",
                    "",
                  ].map((x) => (
                    <th key={x} className="px-4 py-3">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map(({ asset, testDueState, maintenanceDueState }) => (
                  <tr key={asset._id}>
                    <td className="px-4 py-4">
                      <Link
                        className="font-bold hover:text-primary"
                        href={`/dashboard/sites/${siteId}/assets/${asset._id}`}
                      >
                        {asset.assetName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {asset.assetCode ?? "No asset code"}
                      </p>
                    </td>
                    <td className="px-4">{asset.category ?? "-"}</td>
                    <td className="px-4">{asset.serialNumber ?? "-"}</td>
                    <td className="px-4">{asset.location ?? "-"}</td>
                    <td className="px-4">
                      <Due state={testDueState} />
                    </td>
                    <td className="px-4">
                      <Due state={maintenanceDueState} />
                    </td>
                    <td className="px-4">
                      <span className="font-bold">
                        {asset.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4">
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/dashboard/sites/${siteId}/assets/${asset._id}`}
                        >
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {modal && (
        <AssetModal onClose={() => setModal(false)} onSubmit={submit} />
      )}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-background">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="text-xl font-extrabold">Asset Reports</h2>
              <button onClick={() => setReportOpen(false)}>
                <X />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <label className="block text-sm font-bold">
                Report Type
                <select
                  className="form-input mt-2"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                >
                  <option value="ASSETS">Asset Register</option>
                  <option value="TEST_TAG">Test &amp; Tag Register</option>
                  <option value="MAINTENANCE">Maintenance Register</option>
                </select>
              </label>
              {reportType !== "ASSETS" && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-bold">
                    From
                    <input
                      type="date"
                      className="form-input mt-2"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </label>
                  <label className="text-sm font-bold">
                    To
                    <input
                      type="date"
                      className="form-input mt-2"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t p-5">
              <Button variant="outline" onClick={() => setReportOpen(false)}>
                Cancel
              </Button>
              <Button onClick={pdf} disabled={!report}>
                <FileDown className="size-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="label-caps text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-extrabold">{value}</p>
    </div>
  );
}
function Due({ state }: { state: string }) {
  return (
    <span
      className={
        state === "OVERDUE"
          ? "font-bold text-red-700"
          : state === "DUE_SOON"
            ? "font-bold text-amber-700"
            : "text-muted-foreground"
      }
    >
      {state.replaceAll("_", " ")}
    </span>
  );
}
export type AssetFields = {
  assetName: string;
  assetCode?: string;
  description?: string;
  category?: string;
  assetType?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  purchaseDate?: string;
  purchasePriceCents?: number;
  status: Status;
  notes?: string;
};
export function AssetModal({
  asset,
  onClose,
  onSubmit,
}: {
  asset?: Doc<"assets">;
  onClose: () => void;
  onSubmit: (fields: AssetFields) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AssetFields>({
    assetName: asset?.assetName ?? "",
    assetCode: asset?.assetCode,
    description: asset?.description,
    category: asset?.category,
    assetType: asset?.assetType,
    manufacturer: asset?.manufacturer,
    model: asset?.model,
    serialNumber: asset?.serialNumber,
    location: asset?.location,
    purchaseDate: asset?.purchaseDate,
    purchasePriceCents: asset?.purchasePriceCents,
    status: asset?.status ?? "ACTIVE",
    notes: asset?.notes,
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSubmit(form);
    setSaving(false);
  }
  const set = (key: keyof AssetFields, value: string | number | undefined) =>
    setForm((x) => ({ ...x, [key]: value }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background"
      >
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-xl font-extrabold">
            {asset ? "Edit Asset" : "Add Asset"}
          </h2>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {[
            ["assetName", "Asset Name *"],
            ["assetCode", "Asset Code"],
            ["category", "Category"],
            ["assetType", "Asset Type"],
            ["manufacturer", "Manufacturer"],
            ["model", "Model"],
            ["serialNumber", "Serial Number"],
            ["location", "Location"],
          ].map(([key, label]) => (
            <label key={key} className="text-sm font-bold">
              {label}
              <input
                required={key === "assetName"}
                className="form-input mt-2"
                value={(form[key as keyof AssetFields] as string) ?? ""}
                onChange={(e) => set(key as keyof AssetFields, e.target.value)}
              />
            </label>
          ))}
          <label className="text-sm font-bold">
            Purchase Date
            <input
              type="date"
              className="form-input mt-2"
              value={form.purchaseDate ?? ""}
              onChange={(e) => set("purchaseDate", e.target.value || undefined)}
            />
          </label>
          <label className="text-sm font-bold">
            Purchase Price ($)
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input mt-2"
              value={
                form.purchasePriceCents === undefined
                  ? ""
                  : form.purchasePriceCents / 100
              }
              onChange={(e) =>
                set(
                  "purchasePriceCents",
                  e.target.value
                    ? Math.round(Number(e.target.value) * 100)
                    : undefined,
                )
              }
            />
          </label>
          <label className="text-sm font-bold">
            Status
            <select
              className="form-input mt-2"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {STATUSES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold sm:col-span-2">
            Description
            <textarea
              className="form-input mt-2"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <label className="text-sm font-bold sm:col-span-2">
            Notes
            <textarea
              className="form-input mt-2"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t p-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Asset"}
          </Button>
        </div>
      </form>
    </div>
  );
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}
function reportDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
function addReportDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
