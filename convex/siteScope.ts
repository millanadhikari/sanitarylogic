import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import schema from "./schema";
import {
  requireSiteAccess,
  requireSiteScopeManagementAccess,
} from "./lib/authorization";
import {
  DEFAULT_SCHEDULE_MODES,
  DEFAULT_TIME_ZONE,
  assertIsoDate,
  assertTimeZone,
  cleanOptional,
  completionModeValidator,
  plannerFrequencyValidator,
  recurrenceModeValidator,
  recordStatusValidator,
  scopeCategoryValidator,
  validateScheduleInput,
  weekdayValidator,
  type CompletionMode,
  type PlannerFrequency,
  type RecurrenceMode,
  type Weekday,
} from "./lib/periodicPlanner";
import {
  STANDARD_TENANCY_SCOPE,
  STANDARD_TENANCY_SCOPE_CATEGORIES,
} from "./lib/standardTenancyScope";

const templateDocValidator = schema.doc("siteScopeTemplates");
const scopeItemDocValidator = schema.doc("siteScopeItems");
const scheduleDocValidator = schema.doc("siteScopeItemSchedules");

const scheduleArgs = {
  frequency: plannerFrequencyValidator,
  recurrenceMode: recurrenceModeValidator,
  completionMode: completionModeValidator,
  startsOn: v.optional(v.string()),
  endsOn: v.optional(v.string()),
  weekdays: v.optional(v.array(weekdayValidator)),
  scheduledFor: v.optional(v.string()),
};

function canManageScope(role: string) {
  return (
    role === "SUPER_ADMIN" ||
    role === "AREA_MANAGER" ||
    role === "SITE_MANAGER"
  );
}

async function getActiveTemplate(ctx: Parameters<typeof requireSiteAccess>[0], siteId: Id<"sites">) {
  return await ctx.db
    .query("siteScopeTemplates")
    .withIndex("by_siteId_and_templateType_and_status", (q) =>
      q
        .eq("siteId", siteId)
        .eq("templateType", "STANDARD_TENANCY")
        .eq("status", "ACTIVE"),
    )
    .unique();
}

export const getSetupState = query({
  args: { siteId: v.id("sites") },
  returns: v.object({
    role: v.string(),
    canManageScope: v.boolean(),
    isConfigured: v.boolean(),
    catalogueAvailable: v.boolean(),
    catalogueVersion: v.string(),
    defaultTimeZone: v.string(),
    template: v.union(templateDocValidator, v.null()),
  }),
  handler: async (ctx, args) => {
    const access = await requireSiteAccess(ctx, args.siteId);
    const template = await getActiveTemplate(ctx, args.siteId);

    return {
      role: access.role,
      canManageScope: canManageScope(access.role),
      isConfigured: template !== null,
      catalogueAvailable: STANDARD_TENANCY_SCOPE.available,
      catalogueVersion: STANDARD_TENANCY_SCOPE.version,
      defaultTimeZone: DEFAULT_TIME_ZONE,
      template,
    };
  },
});

export const getStandardScope = query({
  args: {
    siteId: v.id("sites"),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.object({
    role: v.string(),
    canManageScope: v.boolean(),
    template: v.union(templateDocValidator, v.null()),
    categories: v.array(
      v.object({
        category: scopeCategoryValidator,
        items: v.array(
          v.object({
            item: scopeItemDocValidator,
            schedules: v.array(scheduleDocValidator),
          }),
        ),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const access = await requireSiteAccess(ctx, args.siteId);
    const template = await getActiveTemplate(ctx, args.siteId);

    if (!template) {
      return {
        role: access.role,
        canManageScope: canManageScope(access.role),
        template: null,
        categories: STANDARD_TENANCY_SCOPE_CATEGORIES.map((category) => ({
          category,
          items: [],
        })),
      };
    }

    const itemQuery = ctx.db
      .query("siteScopeItems")
      .withIndex("by_templateId", (q) => q.eq("templateId", template._id));
    const scheduleQuery = args.includeInactive
      ? ctx.db
          .query("siteScopeItemSchedules")
          .withIndex("by_templateId_and_status", (q) =>
            q.eq("templateId", template._id),
          )
      : ctx.db
          .query("siteScopeItemSchedules")
          .withIndex("by_templateId_and_status", (q) =>
            q.eq("templateId", template._id).eq("status", "ACTIVE"),
          );
    const [allItems, activeSchedules] = await Promise.all([
      itemQuery.take(500),
      scheduleQuery.take(1_000),
    ]);
    const items = args.includeInactive
      ? allItems
      : allItems.filter((item) => item.status === "ACTIVE");

    return {
      role: access.role,
      canManageScope: canManageScope(access.role),
      template,
      categories: STANDARD_TENANCY_SCOPE_CATEGORIES.map((category) => ({
        category,
        items: items
          .filter((item) => item.category === category)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => ({
            item,
            schedules: activeSchedules.filter(
              (schedule) => schedule.scopeItemId === item._id,
            ),
          })),
      })),
    };
  },
});

export const initializeStandardScope = mutation({
  args: {
    siteId: v.id("sites"),
    timeZone: v.string(),
    startsOn: v.string(),
    weeklyWeekday: weekdayValidator,
    twiceWeeklyWeekdays: v.array(weekdayValidator),
  },
  returns: v.id("siteScopeTemplates"),
  handler: async (ctx, args) => {
    const access = await requireSiteScopeManagementAccess(ctx, args.siteId);
    assertTimeZone(args.timeZone);
    assertIsoDate(args.startsOn, "Start date");
    if (
      args.twiceWeeklyWeekdays.length !== 2 ||
      new Set(args.twiceWeeklyWeekdays).size !== 2
    ) {
      throw new Error("Bi-Weekly setup requires two distinct weekdays");
    }
    if (!STANDARD_TENANCY_SCOPE.available || STANDARD_TENANCY_SCOPE.items.length === 0) {
      throw new Error(
        "The Standard Tenancy Clean task catalogue is not available in this repository. Add the exact contract tasks to convex/lib/standardTenancyScope.ts before setup.",
      );
    }

    const existing = await getActiveTemplate(ctx, args.siteId);
    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    const templateId = await ctx.db.insert("siteScopeTemplates", {
      companyId: access.site.companyId,
      siteId: access.site._id,
      templateType: "STANDARD_TENANCY",
      sourceTemplateKey: STANDARD_TENANCY_SCOPE.key,
      sourceTemplateVersion: STANDARD_TENANCY_SCOPE.version,
      name: STANDARD_TENANCY_SCOPE.name,
      description: STANDARD_TENANCY_SCOPE.description,
      timeZone: args.timeZone,
      status: "ACTIVE",
      createdBy: access.user._id,
      updatedBy: access.user._id,
      createdAt: now,
      updatedAt: now,
    });

    for (const definition of STANDARD_TENANCY_SCOPE.items) {
      const itemId = await ctx.db.insert("siteScopeItems", {
        companyId: access.site.companyId,
        siteId: access.site._id,
        templateId,
        sourceItemKey: definition.key,
        category: definition.category,
        title: definition.title,
        description: definition.description,
        instructions: definition.instructions,
        sortOrder: definition.sortOrder,
        status: "ACTIVE",
        createdBy: access.user._id,
        updatedBy: access.user._id,
        createdAt: now,
        updatedAt: now,
      });

      for (const schedule of definition.schedules) {
        const modes = DEFAULT_SCHEDULE_MODES[schedule.frequency];
        const completionMode = schedule.completionMode ?? modes.completionMode;
        if (modes.recurrenceMode === "MANUAL_DATE") {
          // Site-determined dates are added by the Site after setup.
          continue;
        }
        await ctx.db.insert("siteScopeItemSchedules", {
          companyId: access.site.companyId,
          siteId: access.site._id,
          templateId,
          scopeItemId: itemId,
          sourceScheduleKey: schedule.key,
          frequency: schedule.frequency as Exclude<PlannerFrequency, "SITE_DETERMINED">,
          recurrenceMode: "RECURRING",
          completionMode,
          startsOn: args.startsOn,
          weekdays:
            schedule.frequency === "WEEKLY"
              ? [args.weeklyWeekday]
              : schedule.frequency === "TWICE_WEEKLY"
                ? args.twiceWeeklyWeekdays
                : undefined,
          status: "ACTIVE",
          createdBy: access.user._id,
          updatedBy: access.user._id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return templateId;
  },
});

export const updateTemplate = mutation({
  args: {
    templateId: v.id("siteScopeTemplates"),
    name: v.string(),
    description: v.optional(v.string()),
    timeZone: v.string(),
  },
  returns: v.id("siteScopeTemplates"),
  handler: async (ctx, args) => {
    const template = await requireTemplate(ctx, args.templateId);
    const access = await requireSiteScopeManagementAccess(ctx, template.siteId);
    const name = args.name.trim();
    if (!name) throw new Error("Template name is required");
    assertTimeZone(args.timeZone);
    await ctx.db.patch(template._id, {
      name,
      description: cleanOptional(args.description),
      timeZone: args.timeZone,
      updatedBy: access.user._id,
      updatedAt: Date.now(),
    });
    return template._id;
  },
});

export const createScopeItem = mutation({
  args: {
    templateId: v.id("siteScopeTemplates"),
    category: scopeCategoryValidator,
    title: v.string(),
    description: v.optional(v.string()),
    instructions: v.optional(v.string()),
    sortOrder: v.number(),
  },
  returns: v.id("siteScopeItems"),
  handler: async (ctx, args) => {
    const template = await requireTemplate(ctx, args.templateId);
    const access = await requireSiteScopeManagementAccess(ctx, template.siteId);
    const title = args.title.trim();
    if (!title) throw new Error("Scope item title is required");
    if (!Number.isFinite(args.sortOrder)) throw new Error("Sort order is invalid");
    const now = Date.now();
    return await ctx.db.insert("siteScopeItems", {
      companyId: template.companyId,
      siteId: template.siteId,
      templateId: template._id,
      category: args.category,
      title,
      description: cleanOptional(args.description),
      instructions: cleanOptional(args.instructions),
      sortOrder: args.sortOrder,
      status: "ACTIVE",
      createdBy: access.user._id,
      updatedBy: access.user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateScopeItem = mutation({
  args: {
    scopeItemId: v.id("siteScopeItems"),
    category: scopeCategoryValidator,
    title: v.string(),
    description: v.optional(v.string()),
    instructions: v.optional(v.string()),
    sortOrder: v.number(),
  },
  returns: v.id("siteScopeItems"),
  handler: async (ctx, args) => {
    const item = await requireScopeItem(ctx, args.scopeItemId);
    const access = await requireSiteScopeManagementAccess(ctx, item.siteId);
    const title = args.title.trim();
    if (!title) throw new Error("Scope item title is required");
    await ctx.db.patch(item._id, {
      category: args.category,
      title,
      description: cleanOptional(args.description),
      instructions: cleanOptional(args.instructions),
      sortOrder: args.sortOrder,
      updatedBy: access.user._id,
      updatedAt: Date.now(),
    });
    return item._id;
  },
});

export const setScopeItemStatus = mutation({
  args: {
    scopeItemId: v.id("siteScopeItems"),
    status: recordStatusValidator,
  },
  returns: v.id("siteScopeItems"),
  handler: async (ctx, args) => {
    const item = await requireScopeItem(ctx, args.scopeItemId);
    const access = await requireSiteScopeManagementAccess(ctx, item.siteId);
    await ctx.db.patch(item._id, {
      status: args.status,
      updatedBy: access.user._id,
      updatedAt: Date.now(),
    });
    return item._id;
  },
});

export const createSchedule = mutation({
  args: { scopeItemId: v.id("siteScopeItems"), ...scheduleArgs },
  returns: v.id("siteScopeItemSchedules"),
  handler: async (ctx, args) => {
    const item = await requireScopeItem(ctx, args.scopeItemId);
    const access = await requireSiteScopeManagementAccess(ctx, item.siteId);
    validateScheduleInput(args);
    return await insertSchedule(ctx, item, access.user._id, args);
  },
});

export const updateSchedule = mutation({
  args: { scheduleId: v.id("siteScopeItemSchedules"), ...scheduleArgs },
  returns: v.id("siteScopeItemSchedules"),
  handler: async (ctx, args) => {
    const schedule = await requireSchedule(ctx, args.scheduleId);
    const access = await requireSiteScopeManagementAccess(ctx, schedule.siteId);
    validateScheduleInput(args);
    const replacement = scheduleFields(args);
    await ctx.db.replace("siteScopeItemSchedules", schedule._id, {
      companyId: schedule.companyId,
      siteId: schedule.siteId,
      templateId: schedule.templateId,
      scopeItemId: schedule.scopeItemId,
      sourceScheduleKey: schedule.sourceScheduleKey,
      ...replacement,
      status: schedule.status,
      createdBy: schedule.createdBy,
      updatedBy: access.user._id,
      createdAt: schedule.createdAt,
      updatedAt: Date.now(),
    });
    return schedule._id;
  },
});

export const setScheduleStatus = mutation({
  args: {
    scheduleId: v.id("siteScopeItemSchedules"),
    status: recordStatusValidator,
  },
  returns: v.id("siteScopeItemSchedules"),
  handler: async (ctx, args) => {
    const schedule = await requireSchedule(ctx, args.scheduleId);
    const access = await requireSiteScopeManagementAccess(ctx, schedule.siteId);
    await ctx.db.patch(schedule._id, {
      status: args.status,
      updatedBy: access.user._id,
      updatedAt: Date.now(),
    });
    return schedule._id;
  },
});

async function requireTemplate(ctx: MutationCtx, id: Id<"siteScopeTemplates">) {
  const template = await ctx.db.get(id);
  if (!template) throw new Error("Standard Scope template not found");
  return template;
}

async function requireScopeItem(ctx: MutationCtx, id: Id<"siteScopeItems">) {
  const item = await ctx.db.get(id);
  if (!item) throw new Error("Standard Scope item not found");
  const template = await requireTemplate(ctx, item.templateId);
  if (
    template.siteId !== item.siteId ||
    template.companyId !== item.companyId
  ) {
    throw new Error("Standard Scope item has an invalid parent relationship");
  }
  return item;
}

async function requireSchedule(
  ctx: MutationCtx,
  id: Id<"siteScopeItemSchedules">,
) {
  const schedule = await ctx.db.get(id);
  if (!schedule) throw new Error("Schedule rule not found");
  const item = await requireScopeItem(ctx, schedule.scopeItemId);
  if (
    item.templateId !== schedule.templateId ||
    item.siteId !== schedule.siteId ||
    item.companyId !== schedule.companyId
  ) {
    throw new Error("Schedule rule has an invalid parent relationship");
  }
  return schedule;
}

type ScheduleInput = {
  frequency: PlannerFrequency;
  recurrenceMode: RecurrenceMode;
  completionMode: CompletionMode;
  startsOn?: string;
  endsOn?: string;
  weekdays?: Weekday[];
  scheduledFor?: string;
};

function scheduleFields(args: ScheduleInput) {
  if (args.recurrenceMode === "MANUAL_DATE") {
    return {
      frequency: "SITE_DETERMINED" as const,
      recurrenceMode: "MANUAL_DATE" as const,
      completionMode: "MANUAL" as const,
      scheduledFor: args.scheduledFor!,
    };
  }
  return {
    frequency: args.frequency as Exclude<PlannerFrequency, "SITE_DETERMINED">,
    recurrenceMode: "RECURRING" as const,
    completionMode: args.completionMode,
    startsOn: args.startsOn!,
    endsOn: args.endsOn,
    weekdays: args.weekdays,
  };
}

async function insertSchedule(
  ctx: MutationCtx,
  item: Doc<"siteScopeItems">,
  userId: Id<"users">,
  args: ScheduleInput,
) {
  const now = Date.now();
  return await ctx.db.insert("siteScopeItemSchedules", {
    companyId: item.companyId,
    siteId: item.siteId,
    templateId: item.templateId,
    scopeItemId: item._id,
    ...scheduleFields(args),
    status: "ACTIVE",
    createdBy: userId,
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
  });
}
