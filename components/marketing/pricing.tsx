import Link from "next/link";
import { Check } from "lucide-react";

type PricingPlan = {
  name: string;
  price: string;
  description: string;
  features: readonly string[];
  cta: string;
  href: string;
  featured?: boolean;
};

const pricingPlans: readonly PricingPlan[] = [
  {
    name: "Starter",
    price: "$149",
    description: "Best for smaller cleaning businesses.",
    features: ["Up to 3 Sites", "Up to 25 Employees", "Sites & Tenancies", "Work Orders & Complaints", "Periodic Planner", "Asset and compliance registers", "PDF Reports", "Email support"],
    cta: "Start free trial",
    href: "/sign-up",
  },
  {
    name: "Growth",
    price: "$299",
    description: "For growing multi-site operators.",
    features: ["Everything in Starter", "Up to 15 Sites", "Up to 100 Employees", "Advanced Site operations", "Employee onboarding", "Area Manager access", "Expanded reporting", "Priority support"],
    cta: "Start free trial",
    href: "/sign-up",
    featured: true,
  },
  {
    name: "Pro",
    price: "$599",
    description: "For larger cleaning operations.",
    features: ["Everything in Growth", "Up to 50 Sites", "Up to 500 Employees", "Advanced operational reporting", "Larger compliance registers", "Priority onboarding", "Dedicated support", "Future modules as released"],
    cta: "Book a demo",
    href: "/sign-up",
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large portfolios and enterprise operators.",
    features: ["Custom Site limits", "Custom employee limits", "Enterprise onboarding", "Custom workflows", "Priority support", "Custom reporting", "Future integration support"],
    cta: "Contact sales",
    href: "/sign-up",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 border-b border-slate-200 bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Simple, transparent pricing</p>
          <h2 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">A plan for every stage of your operation.</h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">Start with the operational tools you need today and grow without rebuilding your system.</p>
        </div>
        <div className="mt-14 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pricingPlans.map((plan) => (
            <article key={plan.name} className={`relative flex flex-col rounded-2xl border p-6 ${plan.featured ? "border-emerald-700 bg-emerald-950 text-white shadow-[0_25px_60px_rgba(6,78,59,0.18)] xl:-translate-y-3" : "border-slate-200 bg-white shadow-sm"}`}>
              {plan.featured && <span className="absolute right-5 top-5 rounded-full bg-emerald-400 px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-emerald-950">Most popular</span>}
              <p className={`font-mono text-xs font-bold uppercase tracking-[0.16em] ${plan.featured ? "text-emerald-400" : "text-emerald-700"}`}>{plan.name}</p>
              <div className="mt-6 flex items-end gap-1.5"><span className="text-4xl font-extrabold tracking-[-0.045em]">{plan.price}</span>{plan.price.startsWith("$") && <span className={`pb-1 text-xs ${plan.featured ? "text-slate-400" : "text-slate-500"}`}>AUD / month</span>}</div>
              <p className={`mt-4 min-h-12 text-sm leading-6 ${plan.featured ? "text-slate-300" : "text-slate-600"}`}>{plan.description}</p>
              <ul className="mt-7 flex-1 space-y-3">
                {plan.features.map((feature) => <li key={feature} className={`flex gap-2.5 text-sm ${plan.featured ? "text-slate-200" : "text-slate-600"}`}><Check className={`mt-0.5 size-4 shrink-0 ${plan.featured ? "text-emerald-400" : "text-emerald-700"}`} />{feature}</li>)}
              </ul>
              <Link href={plan.href} className={`mt-8 inline-flex h-11 items-center justify-center rounded-xl text-sm font-extrabold transition hover:-translate-y-0.5 ${plan.featured ? "bg-emerald-400 text-emerald-950 hover:bg-emerald-300" : "bg-slate-950 text-white hover:bg-emerald-950"}`}>{plan.cta}</Link>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">All prices are displayed in AUD. GST may apply. Pricing is indicative and billing is not yet enabled in the platform.</p>
      </div>
    </section>
  );
}
