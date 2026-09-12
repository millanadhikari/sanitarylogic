"use client";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { AssetModal, type AssetFields } from "./assets-client";
type Tab = "OVERVIEW" | "TEST" | "MAINTENANCE" | "PHOTOS";
export default function AssetDetailClient() {
  const { siteId, assetId } = useParams<{ siteId: string; assetId: string }>();
  const router = useRouter();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const data = useQuery(api.assets.getById, {
    assetId: assetId as Id<"assets">,
    today,
  });
  const update = useMutation(api.assets.update);
  const remove = useMutation(api.assets.remove);
  const saveTest = useMutation(api.assets.saveTest);
  const removeTest = useMutation(api.assets.removeTest);
  const saveMaintenance = useMutation(api.assets.saveMaintenance);
  const removeMaintenance = useMutation(api.assets.removeMaintenance);
  const uploadUrl = useMutation(api.assets.generateUploadUrl);
  const addPhoto = useMutation(api.assets.addPhoto);
  const removePhoto = useMutation(api.assets.removePhoto);
  const [tab, setTab] = useState<Tab>("OVERVIEW");
  const [edit, setEdit] = useState(false);
  const [testModal, setTestModal] = useState<
    Doc<"assetTestAndTagRecords"> | "NEW" | null
  >(null);
  const [maintenanceModal, setMaintenanceModal] = useState<
    Doc<"assetMaintenanceRecords"> | "NEW" | null
  >(null);
  const [uploading, setUploading] = useState(false);
  if (data === undefined)
    return (
      <div className="p-8">
        <div className="h-52 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  if (!data) return null;
  const { asset } = data;
  async function updateAsset(fields: AssetFields) {
    try {
      await update({ assetId: asset._id, ...fields });
      toast.success("Asset updated");
      setEdit(false);
    } catch (e) {
      toast.error(msg(e));
    }
  }
  async function archive() {
    if (!confirm(`Archive ${asset.assetName}?`)) return;
    try {
      await remove({ assetId: asset._id });
      toast.success("Asset archived");
      router.push(`/dashboard/sites/${siteId}/assets`);
    } catch (e) {
      toast.error(msg(e));
    }
  }
  async function photo(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadUrl({ assetId: asset._id });
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Photo upload failed");
      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      const caption = window.prompt("Optional photo caption")?.trim();
      await addPhoto({ assetId: asset._id, storageId, fileName: file.name, caption: caption || undefined });
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setUploading(false);
    }
  }
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      <Link
        href={`/dashboard/sites/${siteId}/assets`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Assets
      </Link>
      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
          <div>
            <p className="label-caps text-muted-foreground">{data.site.name}</p>
            <h1 className="mt-2 text-3xl font-extrabold">{asset.assetName}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {[asset.assetCode, asset.serialNumber]
                .filter(Boolean)
                .join(" · ") || "No code or serial number"}
            </p>
            <p className="mt-3 text-xs font-bold text-primary">
              {asset.status.replaceAll("_", " ")}
            </p>
          </div>
          {data.canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEdit(true)}>
                <Pencil className="size-4" />
                Edit Asset
              </Button>
              <Button
                variant="outline"
                className="text-destructive"
                onClick={archive}
              >
                <Trash2 className="size-4" />
                Archive
              </Button>
            </div>
          )}
        </div>
        <div className="mt-6 flex gap-1 overflow-x-auto border-t">
          {(["OVERVIEW", "TEST", "MAINTENANCE", "PHOTOS"] as Tab[]).map((x) => (
            <button
              key={x}
              className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === x ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              onClick={() => setTab(x)}
            >
              {x === "TEST" ? "Test & Tag" : x[0] + x.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </section>
      {tab === "OVERVIEW" && (
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Asset Information">
            <Info label="Category" value={asset.category} />
            <Info label="Type" value={asset.assetType} />
            <Info label="Manufacturer" value={asset.manufacturer} />
            <Info label="Model" value={asset.model} />
            <Info label="Serial Number" value={asset.serialNumber} />
            <Info label="Location" value={asset.location} />
            <Info label="Purchase Date" value={asset.purchaseDate} />
            <Info
              label="Purchase Price"
              value={
                asset.purchasePriceCents === undefined
                  ? undefined
                  : money(asset.purchasePriceCents)
              }
            />
          </Card>
          <Card title="Operational Summary">
            <Info
              label="Test & Tag"
              value={data.testDueState.replaceAll("_", " ")}
            />
            <Info label="Latest Test" value={data.tests[0]?.testDate} />
            <Info
              label="Maintenance"
              value={data.maintenanceDueState.replaceAll("_", " ")}
            />
            <Info
              label="Latest Maintenance"
              value={data.maintenance[0]?.maintenanceDate}
            />
            <Info label="Description" value={asset.description} />
            <Info label="Notes" value={asset.notes} />
          </Card>
        </section>
      )}
      {tab === "TEST" && (
        <Register
          title="Test & Tag Register"
          canEdit={data.canOperate}
          onAdd={() => setTestModal("NEW")}
          headers={[
            "Date",
            "Result",
            "Tag",
            "Tester",
            "Company",
            "Next Due",
            "Notes",
            "",
          ]}
          rows={data.tests.map((row) => [
            row.testDate,
            row.result,
            row.tagNumber ?? "-",
            row.testedByName ?? "-",
            row.testerCompany ?? "-",
            row.nextTestDueDate ?? "-",
            row.notes ?? "-",
            data.canOperate ? (
              <span key="a" className="flex gap-1">
                <button onClick={() => setTestModal(row)}>Edit</button>
                <button
                  className="text-destructive"
                  onClick={async () => {
                    if (confirm("Delete this test record?"))
                      await removeTest({ recordId: row._id });
                  }}
                >
                  Delete
                </button>
              </span>
            ) : null,
          ])}
        />
      )}
      {tab === "MAINTENANCE" && (
        <Register
          title="Maintenance Register"
          canEdit={data.canOperate}
          onAdd={() => setMaintenanceModal("NEW")}
          headers={[
            "Date",
            "Type",
            "Description",
            "Provider",
            "Technician",
            "Cost",
            "Next Due",
            "Status",
            "",
          ]}
          rows={data.maintenance.map((row) => [
            row.maintenanceDate,
            row.maintenanceType,
            row.description,
            row.serviceProvider ?? "-",
            row.technicianName ?? "-",
            row.costCents === undefined ? "-" : money(row.costCents),
            row.nextMaintenanceDueDate ?? "-",
            row.status,
            data.canOperate ? (
              <span key="a" className="flex gap-1">
                <button onClick={() => setMaintenanceModal(row)}>Edit</button>
                <button
                  className="text-destructive"
                  onClick={async () => {
                    if (confirm("Delete this maintenance record?"))
                      await removeMaintenance({ recordId: row._id });
                  }}
                >
                  Delete
                </button>
              </span>
            ) : null,
          ])}
        />
      )}
      {tab === "PHOTOS" && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex justify-between">
            <h2 className="text-xl font-extrabold">Asset Photos</h2>
            {data.canOperate && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => photo(e.target.files?.[0] ?? null)}
                />
                <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                  <Upload className="size-4" />
                  {uploading ? "Uploading…" : "Upload Photo"}
                </span>
              </label>
            )}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.photos.map((photo) => (
              <figure
                key={photo._id}
                className="overflow-hidden rounded-xl border"
              >
                <div className="relative aspect-video bg-muted">
                  {photo.url && (
                    <Image
                      src={photo.url}
                      alt={photo.caption ?? photo.fileName ?? "Asset photo"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <figcaption className="flex justify-between p-3 text-sm">
                  <span>{photo.caption ?? photo.fileName ?? "Photo"}</span>
                  {data.canOperate && (
                    <button
                      className="text-destructive"
                      onClick={() => removePhoto({ photoId: photo._id })}
                    >
                      Remove
                    </button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      {edit && (
        <AssetModal
          asset={asset}
          onClose={() => setEdit(false)}
          onSubmit={updateAsset}
        />
      )}{" "}
      {testModal && (
        <TestModal
          row={testModal === "NEW" ? undefined : testModal}
          onClose={() => setTestModal(null)}
          onSave={async (fields) => {
            await saveTest({
              assetId: asset._id,
              recordId: testModal === "NEW" ? undefined : testModal._id,
              ...fields,
            });
            setTestModal(null);
            toast.success("Test record saved");
          }}
        />
      )}
      {maintenanceModal && (
        <MaintenanceModal
          row={maintenanceModal === "NEW" ? undefined : maintenanceModal}
          onClose={() => setMaintenanceModal(null)}
          onSave={async (fields) => {
            await saveMaintenance({
              assetId: asset._id,
              recordId:
                maintenanceModal === "NEW" ? undefined : maintenanceModal._id,
              ...fields,
            });
            setMaintenanceModal(null);
            toast.success("Maintenance record saved");
          }}
        />
      )}
    </main>
  );
}
function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="label-caps text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "Not provided"}</p>
    </div>
  );
}
function Register({
  title,
  canEdit,
  onAdd,
  headers,
  rows,
}: {
  title: string;
  canEdit: boolean;
  onAdd: () => void;
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex justify-between p-5">
        <h2 className="text-xl font-extrabold">{title}</h2>
        {canEdit && (
          <Button onClick={onAdd}>
            <Plus className="size-4" />
            Add Record
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              {headers.map((x) => (
                <th key={x} className="px-4 py-3 text-left">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function TestModal({
  row,
  onClose,
  onSave,
}: {
  row?: Doc<"assetTestAndTagRecords">;
  onClose: () => void;
  onSave: (x: {
    testDate: string;
    nextTestDueDate?: string;
    result: "PASS" | "FAIL" | "REQUIRES_ACTION";
    tagNumber?: string;
    testedByName?: string;
    testerCompany?: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const [f, setF] = useState({
    testDate: row?.testDate ?? new Date().toISOString().slice(0, 10),
    nextTestDueDate: row?.nextTestDueDate ?? "",
    result: row?.result ?? "PASS",
    tagNumber: row?.tagNumber ?? "",
    testedByName: row?.testedByName ?? "",
    testerCompany: row?.testerCompany ?? "",
    notes: row?.notes ?? "",
  });
  return (
    <SimpleModal
      title="Test & Tag Record"
      onClose={onClose}
      onSubmit={() =>
        onSave({
          ...f,
          result: f.result as "PASS" | "FAIL" | "REQUIRES_ACTION",
          nextTestDueDate: f.nextTestDueDate || undefined,
        })
      }
    >
      {Object.entries(f).map(([k, v]) =>
        k === "result" ? (
          <select
            key={k}
            className="form-input"
            value={v}
            onChange={(e) =>
              setF((x) => ({
                ...x,
                result: e.target.value as typeof x.result,
              }))
            }
          >
            <option>PASS</option>
            <option>FAIL</option>
            <option>REQUIRES_ACTION</option>
          </select>
        ) : (
          <input
            key={k}
            type={k.toLowerCase().includes("date") ? "date" : "text"}
            className="form-input"
            placeholder={k}
            value={v}
            onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
          />
        ),
      )}
    </SimpleModal>
  );
}
function MaintenanceModal({
  row,
  onClose,
  onSave,
}: {
  row?: Doc<"assetMaintenanceRecords">;
  onClose: () => void;
  onSave: (x: {
    maintenanceDate: string;
    maintenanceType:
      "SERVICE" | "REPAIR" | "INSPECTION" | "PREVENTIVE" | "OTHER";
    description: string;
    serviceProvider?: string;
    technicianName?: string;
    costCents?: number;
    nextMaintenanceDueDate?: string;
    status: "COMPLETED" | "REQUIRES_FOLLOW_UP";
    notes?: string;
  }) => Promise<void>;
}) {
  const [f, setF] = useState({
    maintenanceDate:
      row?.maintenanceDate ?? new Date().toISOString().slice(0, 10),
    maintenanceType: row?.maintenanceType ?? "SERVICE",
    description: row?.description ?? "",
    serviceProvider: row?.serviceProvider ?? "",
    technicianName: row?.technicianName ?? "",
    cost: String(row?.costCents === undefined ? "" : row.costCents / 100),
    nextMaintenanceDueDate: row?.nextMaintenanceDueDate ?? "",
    status: row?.status ?? "COMPLETED",
    notes: row?.notes ?? "",
  });
  return (
    <SimpleModal
      title="Maintenance Record"
      onClose={onClose}
      onSubmit={() =>
        onSave({
          maintenanceDate: f.maintenanceDate,
          maintenanceType: f.maintenanceType as "SERVICE",
          description: f.description,
          serviceProvider: f.serviceProvider || undefined,
          technicianName: f.technicianName || undefined,
          costCents: f.cost ? Math.round(Number(f.cost) * 100) : undefined,
          nextMaintenanceDueDate: f.nextMaintenanceDueDate || undefined,
          status: f.status as "COMPLETED",
          notes: f.notes || undefined,
        })
      }
    >
      {Object.entries(f).map(([k, v]) => (
        <input
          key={k}
          type={k.toLowerCase().includes("date") ? "date" : "text"}
          className="form-input"
          placeholder={k}
          value={v}
          onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
        />
      ))}
    </SimpleModal>
  );
}
function SimpleModal({
  title,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  children: React.ReactNode;
}) {
  async function submit(e: FormEvent) {
    e.preventDefault();
    await onSubmit();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xl rounded-2xl bg-background"
      >
        <div className="flex justify-between border-b p-5">
          <h2 className="font-extrabold">{title}</h2>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="grid gap-3 p-6">{children}</div>
        <div className="flex justify-end gap-2 border-t p-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </div>
  );
}
function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}
function msg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}
