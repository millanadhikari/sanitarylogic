"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export default function TestCompanyPage() {
  const createCompany = useMutation(
    api.companies.create,
  );

  const [result, setResult] = useState("");

  async function handleCreate() {
    try {
      const companyId = await createCompany({
        name: "Test Cleaning Company",
        legalName: "Test Cleaning Company Pty Ltd",
        tradingName: "Test Cleaning",
        abn: "12345678901",
        email: "test@example.com",
        phone: "0400000000",
      });

      setResult(
        `Company created: ${companyId}`,
      );
    } catch (error) {
      console.error(error);

      setResult(
        error instanceof Error
          ? error.message
          : "Something went wrong",
      );
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">
        Test Company Creation
      </h1>

      <button
        onClick={handleCreate}
        className="rounded-md bg-black px-4 py-2 text-white"
      >
        Create Company
      </button>

      {result && (
        <pre className="mt-4">
          {result}
        </pre>
      )}
    </div>
  );
}