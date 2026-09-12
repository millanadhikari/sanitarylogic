"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function TestCurrentUser() {
  const user = useQuery(api.users.getCurrentUser);

  if (user === undefined) {
    return <div>Loading...</div>;
  }

  if (user === null) {
    return <div>No application user found.</div>;
  }

  return (
    <div className="p-6">
      <h1>Current User</h1>

      <pre>
        {JSON.stringify(user, null, 2)}
      </pre>
    </div>
  );
}