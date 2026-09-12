import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  children,
  showHeader = true,
  showFooter = true,
}: {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {showHeader && (
        <header className="flex items-center justify-between px-8 py-5">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-foreground"
          >
            Sanitary Logic
          </Link>

          <span className="text-sm text-muted-foreground">
            Support
          </span>
        </header>
      )}

      <main className="grid-canvas flex flex-1 items-center justify-center border-y border-border px-4 py-16">
        {children}
      </main>

      {showFooter && (
        <footer className="flex flex-col items-center gap-3 px-8 py-5 text-xs sm:flex-row sm:justify-between">
          <span className="font-mono font-bold tracking-tight text-foreground">
            Sanitary Logic
          </span>

          <nav className="flex gap-6 font-mono uppercase tracking-widest text-muted-foreground">
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms of Service
            </Link>

            <Link
              href="/security"
              className="transition-colors hover:text-foreground"
            >
              Security
            </Link>
          </nav>

          <span className="font-mono uppercase tracking-widest text-muted-foreground">
            © {new Date().getFullYear()} Sanitary Logic. All rights reserved.
          </span>
        </footer>
      )}
    </div>
  );
}

export function AuthCard({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-10 shadow-card">
      {children}
    </div>
  );
}