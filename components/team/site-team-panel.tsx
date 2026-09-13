"use client";

import { EmployeeDirectory } from "./employee-directory";
import type { Id } from "@/convex/_generated/dataModel";

export function SiteTeamPanel({ siteId }: { siteId: Id<"sites"> }) {
  return <div className="mt-6"><EmployeeDirectory siteId={siteId} /></div>;
}
