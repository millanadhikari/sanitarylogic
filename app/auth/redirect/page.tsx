import { auth } from "@clerk/nextjs/server";
import AuthRedirectClient from "./auth-redirect-client";

export default async function AuthRedirectPage() {
  await auth.protect();

  return <AuthRedirectClient />;
}