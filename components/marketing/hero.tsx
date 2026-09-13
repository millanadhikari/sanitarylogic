import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  Check,
  CircleAlert,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const metrics = [
  { label: "Sites", value: "12", icon: Building2 },
  { label: "Tenancies", value: "84", icon: ClipboardList },
  { label: "Active cleaners", value: "46", icon: Users },
  { label: "Open work orders", value: "7", icon: CircleAlert },
];

export function Hero() {
  return (
    <section className="relative border-b border-slate-200 bg-[linear-gradient(180deg,#f3fbf7_0%,#ffffff_82%)] pt-18">
      <div className="pointer-events-none absolute inset-0 marketing-grid opacity-55" />
      <div className="relative mx-auto grid max-w-[1240px] gap-14 px-5 pb-20 pt-20 sm:px-8 sm:pt-24 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-28 lg:pt-28">
        <div className="marketing-reveal">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.13em] text-emerald-800 shadow-sm">
            <Sparkles className="size-3.5" />
            Commercial cleaning operations platform
          </div>
          <h1 className="mt-7 max-w-2xl text-balance text-5xl font-extrabold leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[4.7rem]">
            Run your entire cleaning operation from one place.
          </h1>
          <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-slate-600">
            Manage sites, cleaners, periodic services, work orders, assets and client issues without fragmented systems or endless follow-ups.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-950 px-6 text-sm font-extrabold text-white shadow-[0_12px_30px_rgba(6,78,59,0.2)] transition hover:-translate-y-0.5 hover:bg-emerald-900">
              Start free trial <ArrowRight className="size-4" />
            </Link>
            <Link href="#product" className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-extrabold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50">
              View platform
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
            {["No credit card required", "Guided setup", "Built for Australian operations"].map((item) => (
              <span key={item} className="flex items-center gap-1.5"><Check className="size-3.5 text-emerald-700" />{item}</span>
            ))}
          </div>
        </div>

        <div className="marketing-reveal marketing-reveal-delay relative lg:pl-5">
          <div className="absolute -inset-4 -z-10 rounded-[2.2rem] bg-emerald-200/35 blur-3xl" />
          <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_35px_90px_rgba(15,23,42,0.16)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-950 text-white"><span className="text-xs font-black">SL</span></span>
                <div><p className="text-sm font-extrabold">Clayton</p><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operational overview</p></div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">ALL SYSTEMS ACTIVE</span>
            </div>
            <div className="bg-slate-50/70 p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {metrics.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between"><Icon className="size-3.5 text-emerald-700" /><span className="font-mono text-[9px] text-slate-400">LIVE</span></div>
                    <p className="mt-3 text-2xl font-extrabold tracking-tight">{value}</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between"><p className="text-xs font-extrabold">Periodic Planner</p><CalendarCheck2 className="size-4 text-emerald-700" /></div>
                  <div className="mt-4 grid grid-cols-7 gap-1.5">
                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map((day) => (
                      <span key={day} className={`flex aspect-square items-center justify-center rounded-md text-[9px] font-bold ${[3,7,10,14,18,21].includes(day) ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}>{day}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[10px]"><span className="font-semibold text-slate-500">12 tasks due this week</span><span className="font-bold text-emerald-700">View planner →</span></div>
                </div>
                <div className="space-y-3">
                  <StatusPanel icon={ShieldCheck} title="Test & Tag" detail="96% compliant" accent="8 due soon" />
                  <StatusPanel icon={ClipboardList} title="Work Orders" detail="5 in progress" accent="2 urgent" />
                  <StatusPanel icon={Users} title="Site team" detail="18 active" accent="All covered" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusPanel({ icon: Icon, title, detail, accent }: { icon: typeof ShieldCheck; title: string; detail: string; accent: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Icon className="size-3.5" /></span><div><p className="text-[11px] font-extrabold">{title}</p><p className="text-[9px] text-slate-500">{detail}</p></div></div><p className="mt-2 text-right text-[9px] font-bold text-emerald-700">{accent}</p></div>;
}
