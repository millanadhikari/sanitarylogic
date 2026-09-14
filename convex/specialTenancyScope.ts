import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import schema from "./schema";
import { requireSiteAccess, requireSiteScopeManagementAccess } from "./lib/authorization";
import {
  DEFAULT_TIME_ZONE,
  assertIsoDate,
  assertTimeZone,
  cleanOptional,
  completionModeValidator,
  plannerFrequencyValidator,
  recurrenceModeValidator,
  validateScheduleInput,
  weekdayValidator,
  type CompletionMode,
  type PlannerFrequency,
  type RecurrenceMode,
  type Weekday,
} from "./lib/periodicPlanner";
import {
  SPECIAL_TENANCY_SCOPE_CATALOGUE,
  SPECIAL_TENANCY_SCOPE_VERSION,
} from "./lib/specialTenancyScope";

const scheduleInputValidator = v.object({
  frequency: plannerFrequencyValidator,
  recurrenceMode: recurrenceModeValidator,
  completionMode: completionModeValidator,
  startsOn: v.optional(v.string()),
  endsOn: v.optional(v.string()),
  weekdays: v.optional(v.array(weekdayValidator)),
  intervalWeeks: v.optional(v.number()),
  scheduledFor: v.optional(v.string()),
});

const serviceInputValidator = v.object({
  catalogueKey: v.optional(v.string()),
  title: v.string(),
  description: v.optional(v.string()),
  instructions: v.optional(v.string()),
  schedules: v.array(scheduleInputValidator),
});

type ScheduleInput = {
  frequency: PlannerFrequency;
  recurrenceMode: RecurrenceMode;
  completionMode: CompletionMode;
  startsOn?: string;
  endsOn?: string;
  weekdays?: Weekday[];
  intervalWeeks?: number;
  scheduledFor?: string;
};

function canManage(role: string) {
  return role === "SUPER_ADMIN" || role === "AREA_MANAGER" || role === "SITE_MANAGER";
}

export const getSetupData = query({
  args: { siteId: v.id("sites") },
  returns: v.object({
    role: v.string(),
    canManageScope: v.boolean(),
    defaultTimeZone: v.string(),
    tenancies: v.array(v.object({ _id: v.id("tenancies"), name: v.string(), isConfigured: v.boolean() })),
    catalogue: v.array(v.object({
      key: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      defaultSchedules: v.array(v.object({
        frequency: plannerFrequencyValidator,
        recurrenceMode: recurrenceModeValidator,
        completionMode: completionModeValidator,
        weekdays: v.optional(v.array(weekdayValidator)),
        configurableWeekdayCount: v.optional(v.number()),
        optional: v.optional(v.boolean()),
      })),
    })),
  }),
  handler: async (ctx, args) => {
    const access = await requireSiteAccess(ctx, args.siteId);
    const [tenancies, templates] = await Promise.all([
      ctx.db.query("tenancies").withIndex("by_site", (q) => q.eq("siteId", args.siteId)).take(500),
      ctx.db.query("tenancyScopeTemplates").withIndex("by_siteId", (q) => q.eq("siteId", args.siteId)).take(500),
    ]);
    const configured = new Set(templates.filter((template) => template.status === "ACTIVE").map((template) => template.tenancyId));
    return {
      role: access.role,
      canManageScope: canManage(access.role),
      defaultTimeZone: DEFAULT_TIME_ZONE,
      tenancies: tenancies.filter((tenancy) => tenancy.status === "ACTIVE").map((tenancy) => ({ _id: tenancy._id, name: tenancy.name, isConfigured: configured.has(tenancy._id) })),
      catalogue: SPECIAL_TENANCY_SCOPE_CATALOGUE,
    };
  },
});

export const getSpecialScope = query({
  args: { tenancyId: v.id("tenancies"), includeInactive: v.optional(v.boolean()) },
  returns: v.object({
    role: v.string(),
    canManageScope: v.boolean(),
    template: v.union(schema.doc("tenancyScopeTemplates"), v.null()),
    items: v.array(v.object({ item: schema.doc("tenancyScopeItems"), schedules: v.array(schema.doc("tenancyScopeItemSchedules")) })),
  }),
  handler: async (ctx, args) => {
    const tenancy = await ctx.db.get(args.tenancyId);
    if (!tenancy) throw new Error("Tenancy not found");
    const access = await requireSiteAccess(ctx, tenancy.siteId);
    const template = await ctx.db.query("tenancyScopeTemplates").withIndex("by_tenancyId_and_templateType_and_status", (q) => q.eq("tenancyId", args.tenancyId).eq("templateType", "SPECIAL_TENANCY").eq("status", "ACTIVE")).unique();
    if (!template) return { role: access.role, canManageScope: canManage(access.role), template: null, items: [] };
    const [items, schedules] = await Promise.all([
      ctx.db.query("tenancyScopeItems").withIndex("by_templateId", (q) => q.eq("templateId", template._id)).take(500),
      ctx.db.query("tenancyScopeItemSchedules").withIndex("by_templateId_and_status", (q) => q.eq("templateId", template._id).eq("status", "ACTIVE")).take(1000),
    ]);
    const visibleItems = args.includeInactive ? items : items.filter((item) => item.status === "ACTIVE");
    return { role: access.role, canManageScope: canManage(access.role), template, items: visibleItems.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => ({ item, schedules: schedules.filter((schedule) => schedule.scopeItemId === item._id) })) };
  },
});

export const saveSpecialScope = mutation({
  args: {
    tenancyId: v.id("tenancies"),
    timeZone: v.string(),
    services: v.array(serviceInputValidator),
  },
  returns: v.id("tenancyScopeTemplates"),
  handler: async (ctx, args) => {
    const tenancy = await ctx.db.get(args.tenancyId);
    if (!tenancy || tenancy.status !== "ACTIVE") throw new Error("Active tenancy not found");
    const access = await requireSiteScopeManagementAccess(ctx, tenancy.siteId);
    assertTimeZone(args.timeZone);
    if (args.services.length === 0) throw new Error("Select at least one special service");
    if (args.services.length > 100) throw new Error("A special scope cannot contain more than 100 services");
    const knownKeys = new Set(SPECIAL_TENANCY_SCOPE_CATALOGUE.map((service) => service.key));
    for (const service of args.services) {
      if (!service.title.trim()) throw new Error("Every service requires a title");
      if (service.catalogueKey && !knownKeys.has(service.catalogueKey)) throw new Error("Unknown catalogue service");
      if (service.schedules.length === 0) throw new Error(`${service.title} requires at least one schedule`);
      for (const schedule of service.schedules) validateScheduleInput(schedule, { flexibleWeekly: true });
    }

    const existing = await ctx.db.query("tenancyScopeTemplates").withIndex("by_tenancyId_and_templateType_and_status", (q) => q.eq("tenancyId", tenancy._id).eq("templateType", "SPECIAL_TENANCY").eq("status", "ACTIVE")).unique();
    const now = Date.now();
    let templateId: Id<"tenancyScopeTemplates">;
    if (existing) {
      templateId = existing._id;
      const oldItems = await ctx.db.query("tenancyScopeItems").withIndex("by_templateId_and_status", (q) => q.eq("templateId", existing._id).eq("status", "ACTIVE")).take(500);
      const oldSchedules = await ctx.db.query("tenancyScopeItemSchedules").withIndex("by_templateId_and_status", (q) => q.eq("templateId", existing._id).eq("status", "ACTIVE")).take(1000);
      await Promise.all([
        ...oldItems.map((item) => ctx.db.patch(item._id, { status: "INACTIVE", updatedBy: access.user._id, updatedAt: now })),
        ...oldSchedules.map((schedule) => ctx.db.patch(schedule._id, { status: "INACTIVE", updatedBy: access.user._id, updatedAt: now })),
      ]);
      await ctx.db.patch(templateId, { timeZone: args.timeZone, updatedBy: access.user._id, updatedAt: now });
    } else {
      templateId = await ctx.db.insert("tenancyScopeTemplates", {
        companyId: tenancy.companyId, siteId: tenancy.siteId, tenancyId: tenancy._id,
        templateType: "SPECIAL_TENANCY", sourceTemplateKey: "SPECIAL_TENANCY_SERVICES",
        sourceTemplateVersion: SPECIAL_TENANCY_SCOPE_VERSION, name: `${tenancy.name} Special Scope`,
        description: "Tenancy-specific services in addition to the inherited Standard Scope",
        timeZone: args.timeZone, status: "ACTIVE", createdBy: access.user._id, updatedBy: access.user._id, createdAt: now, updatedAt: now,
      });
    }

    for (const [index, service] of args.services.entries()) {
      const itemId = await ctx.db.insert("tenancyScopeItems", {
        companyId: tenancy.companyId, siteId: tenancy.siteId, tenancyId: tenancy._id, templateId,
        sourceServiceKey: service.catalogueKey, title: service.title.trim(), description: cleanOptional(service.description), instructions: cleanOptional(service.instructions),
        sortOrder: index, status: "ACTIVE", createdBy: access.user._id, updatedBy: access.user._id, createdAt: now, updatedAt: now,
      });
      for (const schedule of service.schedules) await insertSchedule(ctx, { tenancy, templateId, itemId, schedule, userId: access.user._id, now });
    }
    return templateId;
  },
});

async function insertSchedule(ctx: MutationCtx, args: {
  tenancy: { _id: Id<"tenancies">; companyId: Id<"companies">; siteId: Id<"sites"> };
  templateId: Id<"tenancyScopeTemplates">;
  itemId: Id<"tenancyScopeItems">;
  schedule: ScheduleInput;
  userId: Id<"users">;
  now: number;
}) {
  const base = { companyId: args.tenancy.companyId, siteId: args.tenancy.siteId, tenancyId: args.tenancy._id, templateId: args.templateId, scopeItemId: args.itemId, status: "ACTIVE" as const, createdBy: args.userId, updatedBy: args.userId, createdAt: args.now, updatedAt: args.now };
  if (args.schedule.recurrenceMode === "MANUAL_DATE") {
    if (!args.schedule.scheduledFor) throw new Error("Scheduled date is required");
    assertIsoDate(args.schedule.scheduledFor, "Scheduled date");
    await ctx.db.insert("tenancyScopeItemSchedules", { ...base, frequency: "SITE_DETERMINED", recurrenceMode: "MANUAL_DATE", completionMode: "MANUAL", scheduledFor: args.schedule.scheduledFor });
    return;
  }
  if (args.schedule.frequency === "SITE_DETERMINED" || !args.schedule.startsOn) throw new Error("Recurring schedule is invalid");
  await ctx.db.insert("tenancyScopeItemSchedules", { ...base, frequency: args.schedule.frequency, recurrenceMode: "RECURRING", completionMode: args.schedule.completionMode, startsOn: args.schedule.startsOn, endsOn: args.schedule.endsOn, weekdays: args.schedule.weekdays, intervalWeeks: args.schedule.intervalWeeks });
}
