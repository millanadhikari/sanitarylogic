import { auth } from "@clerk/nextjs/server";
import SiteDocumentsPageClient from "./site-documents-page-client";

export default async function SiteDocumentsPage() {
  await auth.protect();
  return <SiteDocumentsPageClient />;
}
