import { auth } from "@clerk/nextjs/server";
import EmployeeProfileClient from "./employee-profile-client";

export default async function EmployeeProfilePage() {
  await auth.protect();
  return <EmployeeProfileClient />;
}
