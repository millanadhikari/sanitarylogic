"use client";

import { useState } from "react";
import {
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";

const tabs = ["Sites", "Periodic Planner", "Assets", "Team"] as const;
type Tab = (typeof tabs)[number];

const panels: Record<Tab, { eyebrow: string; title: string; description: string; rows: Array<{ title: string; meta: string; status: string }> }> = {
  Sites: {
    eyebrow: "Portfolio visibility",
    title: "Every site, clearly organised",
    description: "Move from company-wide visibility to the exact tenancy, area or operational record that needs attention.",
    rows: [
      { title: "Clayton Business Centre", meta: "14 tenancies · 18 team members", status: "ACTIVE" },
      { title: "Richmond Corporate Park", meta: "9 tenancies · 12 team members", status: "ACTIVE" },
      { title: "Dandenong Logistics Hub", meta: "6 tenancies · 8 team members", status: "REVIEW" },
    ],
  },
  "Periodic Planner": {
    eyebrow: "Recurring service control",
    title: "Know what is due, and when",
    description: "Standard and special tenancy scope combine into one practical operational view.",
    rows: [
      { title: "Hard floor machine scrub", meta: "Level 2 · Monthly", status: "DUE TODAY" },
      { title: "Carpet extraction clean", meta: "Tenancy 04 · Quarterly", status: "UPCOMING" },
      { title: "Kitchen detail clean", meta: "All active tenancies · Weekly", status: "COMPLETE" },
    ],
  },
  Assets: {
    eyebrow: "Asset & compliance control",
    title: "A reliable record for every asset",
    description: "Keep equipment, maintenance and Test & Tag history connected to the site where it operates.",
    rows: [
      { title: "Floor Scrubber FS-8821", meta: "Maintenance due 18 Sep", status: "DUE SOON" },
      { title: "Vacuum Cleaner VC-2291", meta: "Test & Tag current", status: "COMPLIANT" },
      { title: "Pressure Washer PW-104", meta: "Service completed 02 Sep", status: "ACTIVE" },
    ],
  },
  Team: {
    eyebrow: "Workforce visibility",
    title: "Know exactly who works where",
    description: "Maintain workforce records, site assignments and employee onboarding without creating duplicate profiles.",
    rows: [
      { title: "Maya Thompson", meta: "Site Supervisor · Clayton", status: "ONBOARDED" },
      { title: "Daniel Lee", meta: "Cleaner · Richmond", status: "ACTIVE" },
      { title: "Sofia Martin", meta: "Cleaner · 2 sites", status: "2 TASKS LEFT" },
    ],
  },
};

export function ProductDemo() {
  const [activeTab, setActiveTab] = useState<Tab>("Sites");
  const panel = panels[activeTab];

  return (
    <section id="product" className="scroll-mt-24 bg-slate-950 py-24 text-white sm:py-32">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">One connected workspace</p>
          <h2 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">See the operation, not another spreadsheet.</h2>
          <p className="mt-5 text-lg leading-8 text-slate-400">A purpose-built system that keeps site structure, recurring work, people and compliance records in context.</p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Product areas">
          {tabs.map((tab) => (
            <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${activeTab === tab ? "bg-white text-slate-950 shadow-lg" : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.055] shadow-2xl">
          <div className="grid lg:grid-cols-[0.78fr_1.22fr]">
            <div className="flex flex-col justify-center border-b border-white/10 p-7 sm:p-10 lg:border-b-0 lg:border-r">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-400">{panel.eyebrow}</p>
              <h3 className="mt-4 text-3xl font-extrabold tracking-tight">{panel.title}</h3>
              <p className="mt-4 leading-7 text-slate-400">{panel.description}</p>
              <div className="mt-8 flex items-center gap-2 text-sm font-bold text-emerald-400"><CheckCircle2 className="size-4" />Live, role-aware operational records</div>
            </div>
            <div className="bg-slate-900/70 p-4 sm:p-7">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div><p className="text-sm font-extrabold">{activeTab}</p><p className="mt-1 text-xs text-slate-500">Clayton operational workspace</p></div>
                  <DemoIcon tab={activeTab} />
                </div>
                <div className="mt-3 space-y-2">
                  {panel.rows.map((row, index) => (
                    <div key={row.title} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 font-mono text-xs font-bold text-emerald-400">0{index + 1}</span>
                      <div className="min-w-0 flex-1"><p className="font-bold">{row.title}</p><p className="mt-1 text-xs text-slate-500">{row.meta}</p></div>
                      <span className={`w-fit rounded-full px-2.5 py-1 font-mono text-[9px] font-bold ${row.status.includes("DUE") || row.status.includes("REVIEW") ? "bg-amber-400/10 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}>{row.status}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MiniStat icon={ClipboardCheck} value="27" label="Completed" />
                  <MiniStat icon={CircleAlert} value="4" label="Attention" />
                  <MiniStat icon={ShieldCheck} value="96%" label="On track" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoIcon({ tab }: { tab: Tab }) {
  const Icon = tab === "Sites" ? Building2 : tab === "Periodic Planner" ? CalendarDays : tab === "Assets" ? Boxes : Users;
  return <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400"><Icon className="size-4" /></span>;
}

function MiniStat({ icon: Icon, value, label }: { icon: typeof MapPin; value: string; label: string }) {
  return <div className="rounded-lg bg-white/[0.04] p-3"><Icon className="size-3.5 text-emerald-400" /><p className="mt-2 text-lg font-extrabold">{value}</p><p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p></div>;
}
