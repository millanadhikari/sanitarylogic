import Link from "next/link";
import { Brush } from "lucide-react";

const footerLinks = [
  { title: "Product", links: [["Sites", "#product"], ["Periodic Planner", "#product"], ["Team", "#product"], ["Assets", "#product"], ["Work Orders", "#product"]] },
  { title: "Company", links: [["About", "#why"], ["Get started", "/sign-up"]] },
  { title: "Resources", links: [["FAQ", "#faq"], ["Sign in", "/sign-in"]] },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.7fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-xl bg-emerald-950 text-white"><Brush className="size-4.5" /></span><span className="text-lg font-extrabold tracking-tight">Sanitary Logic</span></Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">Commercial cleaning operations, connected from company level to the work happening on site.</p>
          </div>
          {footerLinks.map((section) => <div key={section.title}><p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{section.title}</p><ul className="mt-4 space-y-3">{section.links.map(([label, href]) => <li key={label}><Link href={href} className="text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-800">{label}</Link></li>)}</ul></div>)}
          <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Legal</p><div className="mt-4 space-y-3 text-sm font-semibold text-slate-400"><p>Privacy <span className="text-[9px] uppercase">— coming soon</span></p><p>Terms <span className="text-[9px] uppercase">— coming soon</span></p></div></div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Sanitary Logic. All rights reserved.</p><p>Built for commercial cleaning operations.</p></div>
      </div>
    </footer>
  );
}
