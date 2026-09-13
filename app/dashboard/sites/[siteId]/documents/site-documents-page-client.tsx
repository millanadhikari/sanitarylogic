"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowLeft, FileText } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SiteDocumentLibrary } from "@/components/sites/site-document-library";

export default function SiteDocumentsPageClient() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId as Id<"sites">;
  const siteData = useQuery(api.sites.getById, { siteId });

  if (siteData === undefined) {
    return <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8"><div className="h-48 animate-pulse rounded-2xl bg-muted" /></div>;
  }

  if (!siteData) return null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
      <Link
        href={`/dashboard/sites/${siteId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to {siteData.site.name}
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="size-6" />
        </span>
        <div>
          <p className="label-caps text-muted-foreground">{siteData.site.name}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Documents</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Site plans, procedures, registers and supporting documents.
          </p>
        </div>
      </div>

      <SiteDocumentLibrary siteId={siteId} />
    </div>
  );
}
