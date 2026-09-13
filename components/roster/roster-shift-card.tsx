import { Moon, RefreshCw, Sun } from "lucide-react";
import type { RosterOccurrence } from "./types";

export function RosterShiftCard({ shift, onClick }: { shift: RosterOccurrence; onClick: () => void }) {
  const Icon = shift.shiftType === "NIGHT" ? Moon : shift.shiftType === "DAY" ? Sun : RefreshCw;
  const cancelled = shift.status === "CANCELLED";
  return (
    <button type="button" onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03] ${cancelled ? "border-dashed bg-muted/50 opacity-70" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-extrabold ${cancelled ? "line-through" : ""}`}>{shift.employeeName}</p>
        <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
      </div>
      <p className="mt-1 font-mono text-xs font-semibold">{shift.startTime} – {shift.endTime}{shift.overnight ? " +1" : ""}</p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {cancelled ? "Cancelled" : shift.shiftSource.toLowerCase().replaceAll("_", " ")} · {shift.shiftType.toLowerCase()}
      </p>
      {shift.replacesEmployeeName && <p className="mt-1 text-[11px] text-muted-foreground">Replacing {shift.replacesEmployeeName}</p>}
    </button>
  );
}
