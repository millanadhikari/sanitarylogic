import { auth } from "@clerk/nextjs/server";
import SiteDetailsClient from "./site-details-client";

export default async function SitePage() {
  await auth.protect();

  return <SiteDetailsClient />;
}