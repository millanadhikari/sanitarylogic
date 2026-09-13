import { CalendarPlus, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RosterFilters, type RosterFilter } from "./roster-filters";

export function RosterToolbar({
  rangeLabel, filter, canManage, onFilterChange, onPrevious, onToday, onNext, onAddShift, onManagePatterns,
}: {
  rangeLabel: string; filter: RosterFilter; canManage: boolean;
  onFilterChange: (value: RosterFilter) => void; onPrevious: () => void; onToday: () => void; onNext: () => void;
  onAddShift: () => void; onManagePatterns: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="icon" onClick={onPrevious} aria-label="Previous week"><ChevronLeft className="size-4" /></Button>
        <div className="min-w-48 text-center text-sm font-extrabold">{rangeLabel}</div>
        <Button type="button" variant="outline" size="icon" onClick={onNext} aria-label="Next week"><ChevronRight className="size-4" /></Button>
        <Button type="button" variant="outline" onClick={onToday}>Today</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <RosterFilters value={filter} onChange={onFilterChange} />
        {canManage && <>
          <Button type="button" variant="outline" className="gap-2" onClick={onManagePatterns}><Settings2 className="size-4" />Manage Permanent Shifts</Button>
          <Button type="button" className="gap-2" onClick={onAddShift}><CalendarPlus className="size-4" />Add Shift</Button>
        </>}
      </div>
    </div>
  );
}
