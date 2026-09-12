"use client";

import {
  Menu,
  Search,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";

import type { AppRole } from "./navigation";

type DashboardHeaderProps = {
  companyName?: string;
  role: AppRole;
  firstName?: string;

  onMenuClick: () => void;
};

export default function DashboardHeader({
  companyName,
  role,
  firstName,
  onMenuClick,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <p className="text-sm font-semibold text-foreground">
            {companyName ??
              "Sanitary Logic"}
          </p>

          <p className="hidden text-xs text-muted-foreground sm:block">
            {firstName
              ? `${firstName} · `
              : ""}
            {formatRole(role)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search can become functional later */}
        <button
          type="button"
          className="hidden h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground hover:bg-muted sm:flex"
        >
          <Search className="h-4 w-4" />
          Search
        </button>

        <UserButton
          
        />
      </div>
    </header>
  );
}

function formatRole(role: AppRole) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}