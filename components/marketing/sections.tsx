import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  CalendarCheck2,
  Check,
  ClipboardList,
  FileCheck2,
  FileText,
  MessageSquareWarning,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";

const painPoints = [
  [Building2, "Site information lives everywhere", "Critical details get buried across inboxes, documents and disconnected spreadsheets."],
  [CalendarCheck2, "Periodic work gets missed", "Recurring services are difficult to see across multiple sites and tenancies."],
  [Wrench, "Compliance history is hard to track", "Asset, Test & Tag and maintenance records become fragmented over time."],
  [MessageSquareWarning, "Service issues lack ownership", "Complaints and work orders disappear into messages without a reliable history."],
] as const;

export function TrustStrip() {
  return <section className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8"><p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Built for teams managing complex cleaning operations</p><div className="mt-6 grid grid-cols-2 gap-4 text-center text-sm font-extrabold text-slate-600 lg:grid-cols-4">{["Commercial Cleaning Companies", "Facility Services Providers", "Multi-Site Operations", "Property Service Teams"].map((item) => <div key={item} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-4">{item}</div>)}</div></div></section>;
}

export function ProblemSection() {
  return <section id="solutions" className="scroll-mt-24 py-24 sm:py-32"><div className="mx-auto max-w-[1240px] px-5 sm:px-8"><div className="grid gap-12 lg:grid-cols-[0.76fr_1.24fr] lg:items-end"><div><SectionLabel>From scattered to connected</SectionLabel><h2 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">Stop running operations across spreadsheets, messages and disconnected systems.</h2><p className="mt-6 text-lg leading-8 text-slate-600">Sanitary Logic gives your teams one operational source of truth—from portfolio structure to the work happening on site.</p></div><div className="grid gap-4 sm:grid-cols-2">{painPoints.map(([Icon, title, copy]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-lg"><span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><Icon className="size-4.5" /></span><h3 className="mt-5 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p></article>)}</div></div></div></section>;
}

export function HowItWorks() {
  const steps = [
    ["01", "Set up your Sites", "Create buildings, tenancies, areas and the operational structure your business already understands.", Building2],
    ["02", "Connect people and work", "Assign teams, recurring services, assets and operational responsibilities in context.", Users],
    ["03", "Run and track operations", "Monitor work orders, complaints, compliance and periodic cleaning from one platform.", BarChart3],
  ] as const;
  return <section className="border-y border-slate-200 bg-emerald-50/45 py-24 sm:py-32"><div className="mx-auto max-w-[1240px] px-5 sm:px-8"><div className="max-w-2xl"><SectionLabel>How it works</SectionLabel><h2 className="mt-4 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">A clear operating model from day one.</h2></div><div className="mt-12 grid gap-5 lg:grid-cols-3">{steps.map(([number, title, copy, Icon]) => <article key={number} className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-7 shadow-sm"><span className="absolute right-5 top-3 font-mono text-6xl font-black tracking-tighter text-emerald-950/[0.055]">{number}</span><span className="flex size-11 items-center justify-center rounded-xl bg-emerald-950 text-white"><Icon className="size-5" /></span><p className="mt-8 font-mono text-xs font-bold text-emerald-700">STEP {number}</p><h3 className="mt-2 text-xl font-extrabold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p></article>)}</div></div></section>;
}

const showcases = [
  { label: "Site operations", title: "Everything starts with the Site.", copy: "Manage site details, tenancies, contacts, team, assets and recurring services from one operational workspace.", icon: Building2, tags: ["Site → Tenancy → Area", "Contacts", "Documents"] },
  { label: "Periodic Planner", title: "Never lose track of recurring cleaning.", copy: "Plan daily, weekly, monthly, quarterly and annual services across sites and tenancies, with standard and special scope kept clear.", icon: CalendarCheck2, tags: ["Year view", "Month view", "Completion history"] },
  { label: "Team & cleaners", title: "Know exactly who works where.", copy: "Maintain your workforce, assign employees to sites and track onboarding without duplicating records.", icon: UserCheck, tags: ["Site assignments", "Onboarding", "Role visibility"] },
  { label: "Work orders & complaints", title: "Turn service issues into tracked action.", copy: "Create, manage and resolve work orders and complaints with status, comments, history and source relationships.", icon: ClipboardList, tags: ["Ownership", "Comments", "Status history"] },
  { label: "Assets & compliance", title: "Keep every asset record in one place.", copy: "Track serial numbers, photos, Test & Tag records, maintenance history and due dates for equipment at each site.", icon: ShieldCheck, tags: ["Test & Tag", "Maintenance", "Asset photos"] },
  { label: "Reporting", title: "Professional reports when you need them.", copy: "Generate structured asset and compliance PDF reports without rebuilding operational spreadsheets.", icon: FileText, tags: ["PDF export", "Register reports", "Print-ready"] },
] as const;

export function ProductShowcase() {
  return <section className="py-24 sm:py-32"><div className="mx-auto max-w-[1240px] px-5 sm:px-8"><div className="mx-auto max-w-3xl text-center"><SectionLabel>Built around the way cleaning operates</SectionLabel><h2 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">From site setup to service delivery, everything stays connected.</h2></div><div className="mt-16 space-y-6">{showcases.map(({ label, title, copy, icon: Icon, tags }, index) => <article key={label} className="grid overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.055)] lg:grid-cols-2"><div className={`flex flex-col justify-center p-8 sm:p-12 ${index % 2 ? "lg:order-2" : ""}`}><SectionLabel>{label}</SectionLabel><h3 className="mt-4 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">{title}</h3><p className="mt-5 max-w-lg leading-7 text-slate-600">{copy}</p><div className="mt-7 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><Check className="mr-1.5 inline size-3" />{tag}</span>)}</div></div><div className={`min-h-72 bg-slate-50 p-7 sm:p-10 ${index % 2 ? "lg:order-1" : ""}`}><MockModule icon={Icon} label={label} index={index} /></div></article>)}</div></div></section>;
}

function MockModule({ icon: Icon, label, index }: { icon: typeof Building2; label: string; index: number }) {
  const widths = ["w-4/5", "w-2/3", "w-11/12", "w-3/5"];
  return <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-emerald-950 text-white"><Icon className="size-4" /></span><div><p className="text-xs font-extrabold capitalize">{label.toLowerCase()}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">Clayton workspace</p></div></div><span className="size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50" /></div><div className="mt-5 grid grid-cols-3 gap-2">{["Active", "Due", "Complete"].map((item, itemIndex) => <div key={item} className="rounded-lg bg-slate-50 p-3"><p className="text-lg font-extrabold">{[18, 7, 42][(index + itemIndex) % 3]}</p><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{item}</p></div>)}</div><div className="mt-4 space-y-2">{widths.map((width, row) => <div key={width} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3"><span className={`size-6 rounded-md ${row === 1 ? "bg-amber-100" : "bg-emerald-100"}`} /><div className="flex-1"><span className={`block h-2 rounded-full bg-slate-200 ${width}`} /><span className="mt-2 block h-1.5 w-2/5 rounded-full bg-slate-100" /></div></div>)}</div></div>;
}

const features = [
  [Building2, "Sites & Tenancies", "Keep every property, occupant and area in a clear hierarchy."],
  [Users, "Cleaner Management", "Maintain workforce records and site assignments."],
  [UserCheck, "Employee Onboarding", "Track consistent onboarding steps and completion."],
  [CalendarCheck2, "Periodic Planner", "Plan and complete recurring cleaning services."],
  [ClipboardList, "Work Orders", "Manage operational work from open to complete."],
  [MessageSquareWarning, "Complaints", "Keep client issues, comments and resolution visible."],
  [Boxes, "Assets", "Know what equipment exists and where it operates."],
  [FileCheck2, "Test & Tag", "Maintain structured electrical testing records."],
  [Wrench, "Maintenance Register", "Record servicing, cost, history and next due dates."],
  [FileText, "PDF Reports", "Produce clean operational and compliance registers."],
  [ShieldCheck, "Role-Based Access", "Give each operational level the appropriate visibility."],
  [Smartphone, "Photo Evidence", "Asset photos are available; broader evidence workflows are planned."],
] as const;

export function FeatureGrid() {
  return <section className="border-y border-slate-200 bg-slate-50 py-24 sm:py-32"><div className="mx-auto max-w-[1240px] px-5 sm:px-8"><div className="max-w-2xl"><SectionLabel>Platform capabilities</SectionLabel><h2 className="mt-4 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">The operational essentials, in one system.</h2></div><div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">{features.map(([Icon, title, copy]) => <article key={title} className="bg-white p-6"><Icon className="size-5 text-emerald-700" /><h3 className="mt-5 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p></article>)}</div></div></section>;
}

export function RoleSection() {
  const roles = [["SUPER ADMIN", "Company-wide visibility"], ["AREA MANAGER", "Assigned multi-site management"], ["SITE MANAGER", "Day-to-day site operations"], ["SUPERVISOR", "Operational oversight and completions"], ["CLEANER", "Read-only access today; mobile workflows planned"]];
  return <section className="py-24 sm:py-32"><div className="mx-auto max-w-[1240px] px-5 sm:px-8"><div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-center"><div><SectionLabel>Role-aware operations</SectionLabel><h2 className="mt-4 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">The right view for every level of the operation.</h2><p className="mt-5 leading-7 text-slate-600">Company leaders, area managers and on-site teams work from the same operational model without losing the boundaries between their responsibilities.</p></div><div className="overflow-hidden rounded-2xl border border-slate-200">{roles.map(([role, detail], index) => <div key={role} className="flex flex-col gap-2 border-b border-slate-200 bg-white px-6 py-5 last:border-0 sm:flex-row sm:items-center"><span className="font-mono text-xs font-bold text-emerald-700 sm:w-40">{String(index + 1).padStart(2, "0")} / {role}</span><span className="font-bold text-slate-700">{detail}</span></div>)}</div></div></div></section>;
}

export function WhySanitaryLogic() {
  const generic = ["Scattered spreadsheets", "Generic task lists", "No tenancy structure", "Fragmented compliance history"];
  const sanitary = ["Site → Tenancy → Area hierarchy", "Recurring cleaning scope", "Cleaning workforce management", "Operational asset and compliance registers"];
  return <section id="why" className="scroll-mt-24 bg-emerald-950 py-24 text-white sm:py-32"><div className="mx-auto max-w-[1100px] px-5 sm:px-8"><div className="text-center"><SectionLabel light>Why Sanitary Logic</SectionLabel><h2 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">Built specifically for cleaning operations.</h2></div><div className="mt-12 grid gap-5 md:grid-cols-2"><ComparisonCard title="Generic tools" items={generic} negative /><ComparisonCard title="Sanitary Logic" items={sanitary} /></div></div></section>;
}

function ComparisonCard({ title, items, negative = false }: { title: string; items: string[]; negative?: boolean }) {
  return <div className={`rounded-2xl border p-7 ${negative ? "border-white/10 bg-white/5" : "border-emerald-400/30 bg-emerald-400/10"}`}><h3 className="text-xl font-extrabold">{title}</h3><ul className="mt-6 space-y-4">{items.map((item) => <li key={item} className="flex items-center gap-3 text-sm text-emerald-50/80">{negative ? <AlertTriangle className="size-4 text-slate-500" /> : <Check className="size-4 text-emerald-400" />}{item}</li>)}</ul></div>;
}

export function FinalCta() {
  return <section id="contact" className="px-5 py-20 sm:px-8 sm:py-28"><div className="relative mx-auto max-w-[1120px] overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-16 text-center text-white shadow-2xl sm:px-12 sm:py-20"><div className="pointer-events-none absolute inset-0 marketing-grid-dark opacity-30" /><div className="relative mx-auto max-w-3xl"><span className="inline-flex size-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-400"><Sparkles className="size-5" /></span><h2 className="mt-6 text-balance text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">Run your cleaning operation with less admin and more visibility.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">Bring your sites, team, recurring services, assets and operational records into one platform.</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/sign-up" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-extrabold text-emerald-950 transition hover:-translate-y-0.5 hover:bg-emerald-300">Start free trial <ArrowRight className="size-4" /></Link><Link href="/sign-in" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-extrabold transition hover:bg-white/10">Sign in</Link></div><p className="mt-5 text-xs font-semibold text-slate-500">No credit card required to create an account.</p></div></div></section>;
}

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={`font-mono text-xs font-bold uppercase tracking-[0.18em] ${light ? "text-emerald-400" : "text-emerald-700"}`}>{children}</p>;
}
