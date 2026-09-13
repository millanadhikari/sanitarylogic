import { auth } from "@clerk/nextjs/server";
import TimesheetsClient from "./timesheets-client";

export default async function TimesheetsPage() {
  await auth.protect();
  return <TimesheetsClient />;
}
