import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCompanyRole, requireUser } from "./lib/authorization";
import { CLEANER_STANDARD_ONBOARDING } from "./lib/employeeOnboarding";

export const getCompanyTemplate = query({
  args: { companyId: v.id("companies") }, returns: v.any(),
  handler: async (ctx, args) => {
    const { membership } = await requireCompanyRole(ctx, args.companyId, ["SUPER_ADMIN"]);
    const templates = await ctx.db.query("onboardingTemplates")
      .withIndex("by_company", (q) => q.eq("companyId", membership.companyId)).take(100);
    const template = templates.find((row) => row.status === "ACTIVE") ?? templates[0] ?? null;
    if (!template) return null;
    const items = await ctx.db.query("onboardingTemplateItems")
      .withIndex("by_template", (q) => q.eq("templateId", template._id)).take(100);
    return { template, items: items.sort((a, b) => a.sortOrder - b.sortOrder) };
  },
});

export const initializeCleanerTemplate = mutation({
  args: { companyId: v.id("companies") }, returns: v.id("onboardingTemplates"),
  handler: async (ctx, args) => {
    const { user } = await requireCompanyRole(ctx, args.companyId, ["SUPER_ADMIN"]);
    const existing = (await ctx.db.query("onboardingTemplates")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId)).take(100))
      .find((row) => row.name === CLEANER_STANDARD_ONBOARDING.name);
    if (existing) return existing._id;
    const now = Date.now();
    const templateId = await ctx.db.insert("onboardingTemplates", {
      companyId: args.companyId, name: CLEANER_STANDARD_ONBOARDING.name,
      description: CLEANER_STANDARD_ONBOARDING.description, status: "ACTIVE",
      createdBy: user._id, createdAt: now, updatedAt: now,
    });
    for (const [index, title] of CLEANER_STANDARD_ONBOARDING.items.entries()) {
      await ctx.db.insert("onboardingTemplateItems", {
        companyId: args.companyId, templateId, title, sortOrder: index + 1,
        required: true, status: "ACTIVE", createdAt: now, updatedAt: now,
      });
    }
    return templateId;
  },
});

export const saveTemplate = mutation({
  args: {
    templateId: v.id("onboardingTemplates"), name: v.string(), description: v.optional(v.string()),
    items: v.array(v.object({
      itemId: v.optional(v.id("onboardingTemplateItems")), title: v.string(), description: v.optional(v.string()),
      required: v.boolean(), status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    await requireCompanyRole(ctx, template.companyId, ["SUPER_ADMIN"]);
    if (!args.name.trim()) throw new Error("Template name is required");
    const now = Date.now();
    await ctx.db.patch(template._id, { name: args.name.trim(), description: args.description?.trim() || undefined, updatedAt: now });
    for (const [index, item] of args.items.entries()) {
      if (!item.title.trim()) throw new Error("Checklist item title is required");
      const fields = { title: item.title.trim(), description: item.description?.trim() || undefined, required: item.required, status: item.status, sortOrder: index + 1, updatedAt: now };
      if (item.itemId) {
        const existing = await ctx.db.get(item.itemId);
        if (!existing || existing.templateId !== template._id) throw new Error("Checklist item not found");
        await ctx.db.patch(existing._id, fields);
      } else {
        await ctx.db.insert("onboardingTemplateItems", { companyId: template.companyId, templateId: template._id, ...fields, createdAt: now });
      }
    }
    return null;
  },
});

export const updateEmployeeItem = mutation({
  args: {
    itemId: v.id("employeeOnboardingItems"),
    status: v.union(v.literal("PENDING"), v.literal("COMPLETED"), v.literal("NOT_APPLICABLE")),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Onboarding item not found");
    const employee = await ctx.db.get(item.employeeId);
    if (!employee || employee.deletedAt) throw new Error("Employee not found");
    const user = await requireUser(ctx);
    const membership = await ctx.db.query("companyMembers")
      .withIndex("by_user_and_company", (q) => q.eq("userId", user._id).eq("companyId", employee.companyId)).unique();
    if (!membership || membership.status !== "ACTIVE" || membership.role === "SUPERVISOR" || membership.role === "CLEANER") {
      throw new Error("You do not have permission to manage onboarding");
    }
    if (membership.role !== "SUPER_ADMIN") {
      const managerSites = await ctx.db.query("siteAssignments")
        .withIndex("by_user", (q) => q.eq("userId", user._id)).take(500);
      const allowed = new Set(managerSites.filter((row) => row.status === "ACTIVE" && row.companyId === employee.companyId).map((row) => row.siteId as string));
      const employeeSites = await ctx.db.query("employeeSiteAssignments")
        .withIndex("by_employee", (q) => q.eq("employeeId", employee._id)).take(100);
      if (!employeeSites.some((row) => row.status === "ACTIVE" && allowed.has(row.siteId))) throw new Error("You do not have access to this employee");
    }
    await ctx.db.patch(item._id, {
      status: args.status, notes: args.notes?.trim() || undefined,
      completedAt: args.status === "COMPLETED" ? Date.now() : undefined,
      completedBy: args.status === "COMPLETED" ? user._id : undefined, updatedAt: Date.now(),
    });
    return null;
  },
});
