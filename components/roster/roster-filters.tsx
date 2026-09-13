import type { ShiftType } from "./types";

export type RosterFilter = "ALL" | ShiftType;

export function RosterFilters({ value, onChange }: { value: RosterFilter; onChange: (value: RosterFilter) => void }) {
  const filters: Array<{ value: RosterFilter; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "DAY", label: "Day" },
    { value: "NIGHT", label: "Night" },
    { value: "OTHER", label: "Other" },
  ];
  return (
    <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1" aria-label="Filter roster by shift type">
      {filters.map((filter) => (
        <button key={filter.value} type="button" onClick={() => onChange(filter.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${value === filter.value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {filter.label}
        </button>
      ))}
    </div>
  );
}
