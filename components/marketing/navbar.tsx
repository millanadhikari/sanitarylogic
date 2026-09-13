import Link from "next/link";
import { ArrowRight, Brush, Menu } from "lucide-react";

const navigation = [
  { label: "Product", href: "#product" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function MarketingNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Sanitary Logic home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-950 text-white shadow-sm">
            <Brush className="size-4.5" />
          </span>
          <span className="text-lg font-extrabold tracking-[-0.03em]">Sanitary Logic</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-emerald-800">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/sign-in" className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100">
            Sign in
          </Link>
          <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-900">
            Start free trial
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <details className="group relative sm:hidden">
          <summary className="flex size-10 list-none items-center justify-center rounded-xl border border-slate-200 [&::-webkit-details-marker]:hidden">
            <Menu className="size-5" />
            <span className="sr-only">Open navigation</span>
          </summary>
          <div className="absolute right-0 top-12 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-slate-50">
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid gap-2 border-t border-slate-100 pt-3">
              <Link href="/sign-in" className="rounded-xl px-4 py-2.5 text-center text-sm font-bold">Sign in</Link>
              <Link href="/sign-up" className="rounded-xl bg-emerald-950 px-4 py-2.5 text-center text-sm font-bold text-white">Start free trial</Link>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
