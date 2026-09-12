import { auth } from "@clerk/nextjs/server";
import TenancyDetailsClient from "./tenancy-details-client";
import TenanciesClient from "../tenancies-client";

export default async function TenancyPage() {
  await auth.protect();

  return <TenancyDetailsClient />;
  // return <TenanciesClient />;
}
