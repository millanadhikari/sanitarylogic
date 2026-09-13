import { Plus } from "lucide-react";

const questions = [
  ["What is Sanitary Logic?", "Sanitary Logic is an operations platform built for commercial cleaning companies. It connects site structure, people, recurring services, work orders, complaints, assets and compliance records."],
  ["Who is Sanitary Logic for?", "It is designed for commercial cleaning businesses, facility service providers and property service teams managing one or many operational sites."],
  ["Can I manage multiple Sites?", "Yes. Companies can manage multiple Sites, with Tenancies and Areas organised beneath each Site and role-based access for operational teams."],
  ["Can cleaners be added without creating a login?", "Yes. A workforce record can be created and assigned to Sites without automatically creating an application login."],
  ["Can I manage Test & Tag and maintenance records?", "Yes. Asset records support Test & Tag and maintenance history, due dates and operational register reporting."],
  ["Can I generate PDF reports?", "Yes. The current platform generates formal Asset Register, Test & Tag Register and Maintenance Register PDF reports."],
  ["Can I manage recurring cleaning schedules?", "Yes. The Periodic Planner supports Site-level standard scope, tenancy-specific special scope, multiple recurrence patterns and completion history."],
  ["Does Sanitary Logic support work orders and complaints?", "Yes. Work orders and complaints support status workflows, searching, history, comments and source relationships where applicable."],
  ["Will rosters and timesheets be available?", "Rosters and timesheets are planned for a future release. They are not included in the current product."],
  ["Can I try it before paying?", "You can create an account without entering payment details. Commercial billing and subscription processing are not yet enabled."],
] as const;

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto grid max-w-[1100px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.62fr_1.38fr]">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Frequently asked questions</p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">The practical details.</h2>
          <p className="mt-5 leading-7 text-slate-600">Clear answers about what the platform supports today and what is still planned.</p>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {questions.map(([question, answer]) => (
            <details key={question} className="group py-1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-extrabold [&::-webkit-details-marker]:hidden">
                {question}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-emerald-800 transition-transform group-open:rotate-45"><Plus className="size-4" /></span>
              </summary>
              <p className="max-w-2xl pb-6 pr-12 text-sm leading-7 text-slate-600">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
