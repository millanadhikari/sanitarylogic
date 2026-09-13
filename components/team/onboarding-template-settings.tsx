"use client";

import { useMutation, useQuery } from "convex/react";
import { ChevronDown, ChevronUp, Plus, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

type DraftItem = { itemId?: Id<"onboardingTemplateItems">; title: string; description?: string; required: boolean; status: "ACTIVE" | "INACTIVE" };
export function OnboardingTemplateSettings({ companyId }: { companyId: Id<"companies"> }) {
  const data = useQuery(api.onboarding.getCompanyTemplate, { companyId });
  const initialize = useMutation(api.onboarding.initializeCleanerTemplate);
  if (data === undefined) return <div className="h-28 animate-pulse rounded-2xl bg-muted" />;
  if (!data) return <section className="rounded-2xl border border-dashed bg-card p-6"><h2 className="text-xl font-extrabold">Cleaner onboarding template</h2><p className="mt-2 text-sm text-muted-foreground">Create the standard 12-item cleaner induction checklist. New employees will receive their own copy.</p><Button className="mt-4" onClick={async () => { await initialize({ companyId }); toast.success("Onboarding template initialized"); }}>Initialize standard template</Button></section>;
  return <TemplateEditor key={data.template._id} data={data} />;
}

function TemplateEditor({ data }: { data: { template: Doc<"onboardingTemplates">; items: Doc<"onboardingTemplateItems">[] } }) {
  const save = useMutation(api.onboarding.saveTemplate);
  const [name, setName] = useState(data.template.name);
  const [description, setDescription] = useState(data.template.description ?? "");
  const [items, setItems] = useState<DraftItem[]>(data.items.map((item) => ({ itemId: item._id, title: item.title, description: item.description, required: item.required, status: item.status })));
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const invalidExistingItem = items.find(
        (item) => item.itemId && !item.title.trim(),
      );
      if (invalidExistingItem) {
        throw new Error("Every saved checklist item needs a title");
      }

      const populatedItems = items.filter(
        (item) => item.itemId || item.title.trim(),
      );

      await save({
        templateId: data.template._id,
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        items: populatedItems.map((item) => ({
          ...(item.itemId ? { itemId: item.itemId } : {}),
          title: item.title.trim(),
          ...(item.description?.trim()
            ? { description: item.description.trim() }
            : {}),
          required: item.required,
          status: item.status,
        })),
      });
      setItems(populatedItems);
      toast.success("Onboarding template saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save template",
      );
    } finally {
      setSaving(false);
    }
  }

  return <section className="rounded-2xl border bg-card p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-extrabold">Onboarding template</h2><p className="mt-1 text-sm text-muted-foreground">{items.length} checklist items · Changes apply to future employee checklists.</p></div><div className="flex flex-wrap gap-2">{expanded && <Button disabled={saving} onClick={handleSave}><Save className="size-4" />{saving ? "Saving…" : "Save Template"}</Button>}<Button type="button" variant="outline" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}{expanded ? "Close Editor" : "Open Editor"}</Button></div></div>
    {expanded && <div className="mt-5 grid gap-3 border-t pt-5"><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" /><textarea className="form-input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
      {items.map((item, index) => <div key={item.itemId ?? index} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_auto_auto]"><input className="form-input" value={item.title} onChange={(e) => setItems((current) => current.map((x, i) => i === index ? { ...x, title: e.target.value } : x))} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.required} onChange={(e) => setItems((current) => current.map((x, i) => i === index ? { ...x, required: e.target.checked } : x))} />Required</label><select className="form-input" value={item.status} onChange={(e) => setItems((current) => current.map((x, i) => i === index ? { ...x, status: e.target.value as "ACTIVE" | "INACTIVE" } : x))}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>)}
      <Button variant="outline" className="justify-self-start" onClick={() => setItems((current) => [...current, { title: "", required: true, status: "ACTIVE" }])}><Plus className="size-4" />Add checklist item</Button>
    </div>}
  </section>;
}
