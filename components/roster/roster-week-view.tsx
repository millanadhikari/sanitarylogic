import { CalendarDays } from "lucide-react";
import { RosterShiftCard } from "./roster-shift-card";
import type { RosterOccurrence } from "./types";

export function RosterWeekView({ weekStart, occurrences, onSelect }: { weekStart: string; occurrences: RosterOccurrence[]; onSelect: (shift: RosterOccurrence) => void }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      {days.map((date) => {
        const shifts = occurrences.filter((shift) => shift.workDate === date);
        return (
          <div key={date} className="min-h-52 rounded-2xl border border-border bg-muted/25 p-3">
            <div className="mb-3 border-b border-border pb-3">
              <p className="text-xs font-extrabold uppercase tracking-wide">{formatDay(date)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(date)}</p>
            </div>
            <div className="space-y-2">
              {shifts.length ? shifts.map((shift) => <RosterShiftCard key={shift.occurrenceKey} shift={shift} onClick={() => onSelect(shift)} />) : (
                <div className="flex min-h-28 flex-col items-center justify-center text-center text-muted-foreground"><CalendarDays className="size-4" /><p className="mt-2 text-xs">No shifts</p></div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function addDays(date: string, amount: number) { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + amount); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function formatDay(date: string) { return new Intl.DateTimeFormat("en-AU", { weekday: "short" }).format(new Date(`${date}T00:00:00`)); }
function formatDate(date: string) { return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00`)); }
