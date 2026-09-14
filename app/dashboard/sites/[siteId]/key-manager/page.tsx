import { auth } from "@clerk/nextjs/server";

import KeyManagerClient from "./key-manager-client";

export default async function KeyManagerPage() {
  await auth.protect();
  return <KeyManagerClient />;
}
