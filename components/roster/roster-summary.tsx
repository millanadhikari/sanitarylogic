import { Clock3, Moon, Sun, Users } from "lucide-react";

export function RosterSummary({ summary }: { summary: { permanentStaff: number; casualAdditionalShifts: number; dayShiftMinutes: number; nightShiftMinutes: number; scheduledMinutes: number } }) {
  const cards = [
    { label: "Permanent Staff", value: String(summary.permanentStaff), icon: Users },
    { label: "Casual / Additional", value: String(summary.casualAdditionalShifts), icon: Users },
    { label: "Day Shift Hours", value: hours(summary.dayShiftMinutes), icon: Sun },
    { label: "Night Shift Hours", value: hours(summary.nightShiftMinutes), icon: Moon },
    { label: "Scheduled Hours", value: hours(summary.scheduledMinutes), icon: Clock3 },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between"><p className="label-caps text-muted-foreground">{label}</p><Icon className="size-4 text-primary" /></div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight">{value}</p>
        </div>
      ))}
    </section>
  );
}

function hours(minutes: number) {
  const value = minutes / 60;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}h`;
}
