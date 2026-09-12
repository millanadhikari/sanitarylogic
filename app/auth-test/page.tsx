"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AuthTestPage() {
  const identity = useQuery(api.authTest.getIdentity);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">
        Convex Authentication Test
      </h1>

      <pre className="mt-4 rounded-lg bg-gray-100 p-4">
        {JSON.stringify(identity, null, 2)}
      </pre>
    </main>
  );
}