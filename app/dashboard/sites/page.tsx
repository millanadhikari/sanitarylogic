import { auth } from "@clerk/nextjs/server";
import SitesClient from "./sites-client";

export default async function SitesPage() {
  await auth.protect();

  return <SitesClient />;
}