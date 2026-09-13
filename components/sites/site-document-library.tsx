"use client";

import { useMutation, useQuery } from "convex/react";
import { Download, FileText, Plus, Trash2, Upload, X } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt"];

export function SiteDocumentLibrary({ siteId }: { siteId: Id<"sites"> }) {
  const data = useQuery(api.siteDocuments.list, { siteId });
  const generateUploadUrl = useMutation(api.siteDocuments.generateUploadUrl);
  const addDocument = useMutation(api.siteDocuments.add);
  const removeDocument = useMutation(api.siteDocuments.remove);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"siteDocuments"> | null>(null);

  if (data === undefined) {
    return <div className="mt-6 h-72 animate-pulse rounded-2xl bg-muted" />;
  }

  return (
    <>
      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="label-caps text-muted-foreground">Files</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight">Site Documents</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.documents.length} {data.documents.length === 1 ? "document" : "documents"} stored for this site.
            </p>
          </div>
          {data.canManage && (
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setIsOpen(true)}>
              <Plus className="size-4" />
              Add Document
            </Button>
          )}
        </div>

        {data.documents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-bold">No site documents</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Store site plans, procedures, registers and other supporting files here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.documents.map((document) => (
              <div key={document._id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold">{document.title}</p>
                  {document.description && (
                    <p className="mt-1 break-words text-sm text-muted-foreground">{document.description}</p>
                  )}
                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    {document.fileName} · {formatBytes(document.fileSize)} · Uploaded {formatDate(document.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {document.url && (
                    <Button asChild variant="ghost" size="icon" title={`Download ${document.title}`}>
                      <a href={document.url} target="_blank" rel="noreferrer">
                        <Download className="size-4" />
                      </a>
                    </Button>
                  )}
                  {data.canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={`Delete ${document.title}`}
                      disabled={deletingId === document._id}
                      onClick={async () => {
                        if (!window.confirm(`Delete “${document.title}”? This will permanently remove the file.`)) return;
                        setDeletingId(document._id);
                        try {
                          await removeDocument({ documentId: document._id });
                          toast.success("Document deleted");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Could not delete document");
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isOpen && (
        <DocumentModal
          siteId={siteId}
          isSaving={isSaving}
          onClose={() => !isSaving && setIsOpen(false)}
          onSave={async ({ title, description, file }) => {
            setIsSaving(true);
            try {
              validateFile(file);
              const uploadUrl = await generateUploadUrl({ siteId });
              const response = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type || "application/octet-stream" },
                body: file,
              });
              if (!response.ok) throw new Error("File upload failed");
              const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
              await addDocument({
                siteId,
                storageId,
                title,
                description: description || undefined,
                fileName: file.name,
              });
              toast.success("Document added");
              setIsOpen(false);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not add document");
            } finally {
              setIsSaving(false);
            }
          }}
        />
      )}
    </>
  );
}

function DocumentModal({
  siteId,
  isSaving,
  onClose,
  onSave,
}: {
  siteId: Id<"sites">;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: { title: string; description: string; file: File }) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!title.trim()) return toast.error("Enter a document title");
    if (!file) return toast.error("Select a document to upload");
    await onSave({ title: title.trim(), description: description.trim(), file });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby={`site-document-title-${siteId}`}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 id={`site-document-title-${siteId}`} className="text-xl font-extrabold tracking-tight">Add Site Document</h2>
            <p className="mt-1 text-sm text-muted-foreground">PDF, Word, Excel, CSV or text · maximum 20 MB.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} disabled={isSaving} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <label className="block text-sm font-bold">
            Title <span className="text-destructive">*</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none focus:border-primary" placeholder="e.g. Emergency procedures" />
          </label>
          <label className="block text-sm font-bold">
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 font-normal outline-none focus:border-primary" placeholder="Optional context about this document" />
          </label>
          <label className="block text-sm font-bold">
            File <span className="text-destructive">*</span>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" className="mt-2 block w-full rounded-xl border border-input bg-background p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:font-bold file:text-primary" />
          </label>
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              <Upload className="size-4" />
              {isSaving ? "Uploading…" : "Upload Document"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function validateFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error("Upload a PDF, Word, Excel, CSV or text document");
  }
  if (file.size > MAX_FILE_SIZE) throw new Error("Documents must be 20 MB or smaller");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(timestamp);
}
