"use client";

import { useMutation } from "convex/react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Modal } from "@/components/roster/add-roster-shift-modal";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function TimesheetSettingsModal({ siteId, effective, onClose }: { siteId: Id<"sites">; effective: { periodType: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY"; weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; fortnightAnchorDate?: string }; onClose: () => void }) {
  const saveSettings = useMutation(api.timesheetSettings.save);
  const [periodType, setPeriodType] = useState(effective.periodType);
  const [weekStartsOn, setWeekStartsOn] = useState(effective.weekStartsOn);
  const [anchor, setAnchor] = useState(effective.fortnightAnchorDate ?? localDate());
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); try { await saveSettings({ siteId, periodType, weekStartsOn, fortnightAnchorDate: periodType === "FORTNIGHTLY" ? anchor : undefined }); toast.success("Timesheet cycle updated"); onClose(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save settings"); } finally { setSaving(false); } }
  return <Modal title="Timesheet Cycle Settings" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Period Type"><select className="form-input" value={periodType} onChange={(event) => setPeriodType(event.target.value as typeof periodType)}><option value="WEEKLY">Weekly</option><option value="FORTNIGHTLY">Fortnightly</option><option value="MONTHLY">Monthly</option></select></Field>{periodType !== "MONTHLY" && <Field label="Week Starts On"><select className="form-input" value={weekStartsOn} onChange={(event) => setWeekStartsOn(Number(event.target.value) as typeof weekStartsOn)}>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => <option key={day} value={index}>{day}</option>)}</select></Field>}{periodType === "FORTNIGHTLY" && <Field label="Fortnight Anchor Date"><input className="form-input" type="date" value={anchor} onChange={(event) => setAnchor(event.target.value)} required /><span className="mt-1 block text-xs text-muted-foreground">This date is the first day of a known fortnight.</span></Field>}<div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Button></div></form></Modal>;
}
function localDate() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
