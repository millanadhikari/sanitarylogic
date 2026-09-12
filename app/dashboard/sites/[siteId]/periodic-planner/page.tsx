import { auth } from "@clerk/nextjs/server";

import PeriodicPlannerClient from "./periodic-planner-client";

export default async function PeriodicPlannerPage() {
  await auth.protect();

  return <PeriodicPlannerClient />;
}
