import { auth } from "@clerk/nextjs/server";
import RosterClient from "./roster-client";

export default async function RosterPage() {
  await auth.protect();
  return <RosterClient />;
}
