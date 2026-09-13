import { ChevronLeft, ChevronRight, FilePlus2, Settings2, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TimesheetPeriodHeader({ periodLabel, cycle, canManage, onPrevious, onToday, onNext, onGenerate, onAddTime, onSettings }: {
  periodLabel: string; cycle: string; canManage: boolean; onPrevious: () => void; onToday: () => void; onNext: () => void;
  onGenerate: () => void; onAddTime: () => void; onSettings: () => void;
}) {
  return <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="icon" onClick={onPrevious} aria-label="Previous period"><ChevronLeft className="size-4" /></Button><div className="min-w-52 text-center"><p className="font-extrabold">{periodLabel}</p><p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{cycle}</p></div><Button variant="outline" size="icon" onClick={onNext} aria-label="Next period"><ChevronRight className="size-4" /></Button><Button variant="outline" onClick={onToday}>Today</Button></div>
      {canManage && <div className="flex flex-wrap gap-2"><Button variant="outline" className="gap-2" onClick={onSettings}><Settings2 className="size-4" />Cycle Settings</Button><Button variant="outline" className="gap-2" onClick={onAddTime}><TimerReset className="size-4" />Add Unscheduled Time</Button><Button className="gap-2" onClick={onGenerate}><FilePlus2 className="size-4" />Generate Draft Timesheets</Button></div>}
    </div>
  </section>;
}
