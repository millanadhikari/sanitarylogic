import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import schema from "./schema";
import {
  requirePlannerCompletionAccess,
  requireSiteAccess,
} from "./lib/authorization";
import {
  MAX_LIST_EXPANSION,
  MAX_LIST_RANGE_DAYS,
  MAX_MONTH_OCCURRENCES,
  addDays,
  assertIsoDate,
  assertMonth,
  cleanOptional,
  daysBetween,
  isOccurrenceDate,
  monthBounds,
  occurrenceDatesInRange,
  plannerFrequencyValidator,
  scopeCategoryValidator,
} from "./lib/periodicPlanner";

const companyRoleValidator = v.union(
  v.literal("SUPER_ADMIN"),
  v.literal("AREA_MANAGER"),
  v.literal("SITE_MANAGER"),
  v.literal("SUPERVISOR"),
  v.literal("CLEANER"),
);
const completionDocValidator = schema.doc("plannerCompletions");

const occurrenceValidator = v.object({
  scopeType: v.union(v.literal("STANDARD"), v.literal("SPECIAL")),
  occurrenceKey: v.string(),
  occurrenceDate: v.string(),
  tenancyId: v.id("tenancies"),
  tenancyName: v.string(),
  scopeItemId: v.union(v.id("siteScopeItems"), v.id("tenancyScopeItems")),
  scopeItemTitle: v.string(),
  scheduleId: v.union(v.id("siteScopeItemSchedules"), v.id("tenancyScopeItemSchedules")),
  category: v.union(scopeCategoryValidator, v.literal("SPECIAL")),
  frequency: plannerFrequencyValidator,
  recurrenceMode: v.union(
    v.literal("RECURRING"),
    v.literal("MANUAL_DATE"),
  ),
  completionMode: v.union(v.literal("AUTO"), v.literal("MANUAL")),
  isComplete: v.boolean(),
  isAssumedComplete: v.boolean(),
  isOverdue: v.boolean(),
  completion: v.union(completionDocValidator, v.null()),
});

const filterArgs = {
  tenancyId: v.optional(v.id("tenancies")),
  category: v.optional(scopeCategoryValidator),
  frequency: v.optional(plannerFrequencyValidator),
  scopeType: v.optional(v.union(v.literal("STANDARD"), v.literal("SPECIAL"))),
};

function canComplete(role: string) {
  return (
    role === "SUPER_ADMIN" ||
    role === "AREA_MANAGER" ||
    role === "SITE_MANAGER" ||
    role === "SUPERVISOR"
  );
}

export const getYearSummary = query({
  args: {
    siteId: v.id("sites"),
    year: v.number(),
    today: v.string(),
    ...filterArgs,
  },
  returns: v.object({
    role: companyRoleValidator,
    canComplete: v.boolean(),
    months: v.array(
      v.object({
        month: v.string(),
        scheduledCount: v.number(),
        autoCount: v.number(),
        manualCount: v.number(),
        completedCount: v.number(),
        pendingCount: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const access = await requireSiteAccess(ctx, args.siteId);
    assertIsoDate(args.today, "Today");
    if (!Number.isInteger(args.year) || args.year < 2000 || args.year > 2200) {
      throw new Error("Year is invalid");
    }

    const fromDate = `${args.year}-01-01`;
    const toDate = `${args.year}-12-31`;
    const data = await loadPlannerData(ctx, args.siteId, args, fromDate, toDate);
    const months = Array.from({ length: 12 }, (_, index) => {
      const month = `${args.year}-${String(index + 1).padStart(2, "0")}`;
      const bounds = monthBounds(month);
      let scheduledCount = 0;
      let autoCount = 0;
      let manualCount = 0;
      let completedCount = 0;

      for (const entry of data.entries) {
        const dates = occurrenceDatesInRange(
          entry.schedule,
          bounds.fromDate,
          bounds.toDate,
        );
        const count = dates.length * entry.tenancies.length;
        scheduledCount += count;
        if (entry.schedule.completionMode === "AUTO") {
          autoCount += count;
          completedCount += count;
        } else {
          manualCount += count;
        }
      }
      completedCount += Array.from(data.completions.values()).filter((completion) => completion.occurrenceDate.startsWith(month)).length;

      return {
        month,
        scheduledCount,
        autoCount,
        manualCount,
        completedCount,
        pendingCount: scheduledCount - completedCount,
      };
    });

    return { role: access.role, canComplete: canComplete(access.role), months };
  },
});

export const getMonthView = query({
  args: {
    siteId: v.id("sites"),
    month: v.string(),
    today: v.string(),
    ...filterArgs,
  },
  returns: v.object({
    role: companyRoleValidator,
    canComplete: v.boolean(),
    tenancies: v.array(v.object({ _id: v.id("tenancies"), name: v.string() })),
    occurrences: v.array(occurrenceValidator),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const access = await requireSiteAccess(ctx, args.siteId);
    assertMonth(args.month);
    assertIsoDate(args.today, "Today");
    const bounds = monthBounds(args.month);
    const data = await loadPlannerData(
      ctx,
      args.siteId,
      args,
      bounds.fromDate,
      bounds.toDate,
    );
    const occurrenceResult = buildOccurrences(
      data,
      bounds.fromDate,
      bounds.toDate,
      args.today,
      MAX_MONTH_OCCURRENCES,
    );
    return {
      role: access.role,
      canComplete: canComplete(access.role),
      tenancies: data.allTenancies.map(({ _id, name }) => ({ _id, name })),
      occurrences: occurrenceResult.items,
      truncated: occurrenceResult.truncated,
    };
  },
});

export const getListView = query({
  args: {
    siteId: v.id("sites"),
    fromDate: v.string(),
    toDate: v.string(),
    today: v.string(),
    offset: v.number(),
    limit: v.number(),
    ...filterArgs,
  },
  returns: v.object({
    role: companyRoleValidator,
    canComplete: v.boolean(),
    tenancies: v.array(v.object({ _id: v.id("tenancies"), name: v.string() })),
    items: v.array(occurrenceValidator),
    total: v.number(),
    hasMore: v.boolean(),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const access = await requireSiteAccess(ctx, args.siteId);
    validateRange(args.fromDate, args.toDate, MAX_LIST_RANGE_DAYS);
    assertIsoDate(args.today, "Today");
    if (!Number.isInteger(args.offset) || args.offset < 0) {
      throw new Error("Offset must be a non-negative integer");
    }
    if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 200) {
      throw new Error("Limit must be an integer from 1 to 200");
    }

    const data = await loadPlannerData(
      ctx,
      args.siteId,
      args,
      args.fromDate,
      args.toDate,
    );
    const occurrenceResult = buildOccurrences(
      data,
      args.fromDate,
      args.toDate,
      args.today,
      MAX_LIST_EXPANSION,
    );
    const bounded = occurrenceResult.items;
    return {
      role: access.role,
      canComplete: canComplete(access.role),
      tenancies: data.allTenancies.map(({ _id, name }) => ({ _id, name })),
      items: bounded.slice(args.offset, args.offset + args.limit),
      total: bounded.length,
      hasMore: args.offset + args.limit < bounded.length,
      truncated: occurrenceResult.truncated,
    };
  },
});

export const getCompletionHistory = query({
  args: {
    siteId: v.id("sites"),
    tenancyId: v.optional(v.id("tenancies")),
    scopeItemId: v.optional(v.id("siteScopeItems")),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    role: companyRoleValidator,
    canComplete: v.boolean(),
    items: v.array(
      v.object({
        completion: completionDocValidator,
        scopeType: v.union(v.literal("STANDARD"), v.literal("SPECIAL")),
        tenancyName: v.string(),
        scopeItemTitle: v.string(),
        completedByName: v.union(v.string(), v.null()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const access = await requireSiteAccess(ctx, args.siteId);
    const limit = args.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("History limit must be an integer from 1 to 100");
    }

    if (args.tenancyId) {
      const tenancy = await ctx.db.get(args.tenancyId);
      if (!tenancy || tenancy.siteId !== args.siteId) {
        throw new Error("Tenancy not found at this site");
      }
    }
    if (args.scopeItemId) {
      const item = await ctx.db.get(args.scopeItemId);
      if (!item || item.siteId !== args.siteId) {
        throw new Error("Scope item not found at this site");
      }
    }

    const candidateLimit = Math.min(limit * 3, 300);
    const candidates = args.tenancyId
      ? await ctx.db
          .query("plannerCompletions")
          .withIndex("by_tenancyId_and_completedAt", (q) =>
            q.eq("tenancyId", args.tenancyId!),
          )
          .order("desc")
          .take(candidateLimit)
      : args.scopeItemId
        ? await ctx.db
            .query("plannerCompletions")
            .withIndex("by_scopeItemId_and_completedAt", (q) =>
              q.eq("scopeItemId", args.scopeItemId!),
            )
            .order("desc")
            .take(candidateLimit)
        : await ctx.db
            .query("plannerCompletions")
            .withIndex("by_siteId_and_completedAt", (q) =>
              q.eq("siteId", args.siteId),
            )
            .order("desc")
            .take(candidateLimit);
    const completions = candidates
      .filter(
        (completion) =>
          completion.siteId === args.siteId &&
          (!args.tenancyId || completion.tenancyId === args.tenancyId) &&
          (!args.scopeItemId || ("scopeItemId" in completion && completion.scopeItemId === args.scopeItemId)),
      )
      .slice(0, limit);

    const items = await Promise.all(
      completions.map(async (completion) => {
        const isSpecial = completion.scopeType === "SPECIAL";
        const [tenancy, scopeItem, author] = await Promise.all([
          ctx.db.get(completion.tenancyId),
          isSpecial ? ctx.db.get(completion.specialScopeItemId) : ctx.db.get(completion.scopeItemId),
          completion.completedBy ? ctx.db.get(completion.completedBy) : null,
        ]);
        return {
          completion,
          scopeType: isSpecial ? "SPECIAL" as const : "STANDARD" as const,
          tenancyName: tenancy?.name ?? "Deleted tenancy",
          scopeItemTitle: scopeItem?.title ?? "Deleted scope item",
          completedByName: author
            ? [author.firstName, author.lastName].filter(Boolean).join(" ") ||
              author.email ||
              "User"
            : null,
        };
      }),
    );

    return { role: access.role, canComplete: canComplete(access.role), items };
  },
});

export const completeOccurrence = mutation({
  args: {
    tenancyId: v.id("tenancies"),
    scheduleId: v.id("siteScopeItemSchedules"),
    occurrenceDate: v.string(),
    notes: v.optional(v.string()),
  },
  returns: v.id("plannerCompletions"),
  handler: async (ctx, args) => {
    assertIsoDate(args.occurrenceDate, "Occurrence date");
    const tenancy = await ctx.db.get(args.tenancyId);
    if (!tenancy || tenancy.status !== "ACTIVE") {
      throw new Error("Active tenancy not found");
    }
    const access = await requirePlannerCompletionAccess(ctx, tenancy.siteId);
    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule || schedule.status !== "ACTIVE") {
      throw new Error("Active schedule rule not found");
    }
    const item = await ctx.db.get(schedule.scopeItemId);
    const template = await ctx.db.get(schedule.templateId);
    if (
      !item ||
      item.status !== "ACTIVE" ||
      !template ||
      template.status !== "ACTIVE" ||
      tenancy.siteId !== schedule.siteId ||
      tenancy.companyId !== schedule.companyId ||
      item.siteId !== schedule.siteId ||
      item.templateId !== schedule.templateId ||
      template.siteId !== schedule.siteId ||
      template.companyId !== schedule.companyId
    ) {
      throw new Error("Planner occurrence has an invalid parent relationship");
    }
    if (schedule.completionMode !== "MANUAL") {
      throw new Error("Automatic occurrences do not require manual completion");
    }
    if (!isOccurrenceDate(schedule, args.occurrenceDate)) {
      throw new Error("The selected date is not an occurrence of this schedule");
    }

    const existing = await ctx.db
      .query("plannerCompletions")
      .withIndex("by_tenancyId_and_scheduleId_and_occurrenceDate", (q) =>
        q
          .eq("tenancyId", tenancy._id)
          .eq("scheduleId", schedule._id)
          .eq("occurrenceDate", args.occurrenceDate),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        completionModeSnapshot: schedule.completionMode,
        status: "COMPLETED",
        completedAt: now,
        completedBy: access.user._id,
        notes: cleanOptional(args.notes),
        voidedAt: undefined,
        voidedBy: undefined,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("plannerCompletions", {
      companyId: tenancy.companyId,
      siteId: tenancy.siteId,
      tenancyId: tenancy._id,
      templateId: template._id,
      scopeItemId: item._id,
      scheduleId: schedule._id,
      occurrenceDate: args.occurrenceDate,
      completionModeSnapshot: schedule.completionMode,
      status: "COMPLETED",
      completedAt: now,
      completedBy: access.user._id,
      notes: cleanOptional(args.notes),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const completeSpecialOccurrence = mutation({
  args: {
    tenancyId: v.id("tenancies"),
    scheduleId: v.id("tenancyScopeItemSchedules"),
    occurrenceDate: v.string(),
    notes: v.optional(v.string()),
  },
  returns: v.id("plannerCompletions"),
  handler: async (ctx, args) => {
    assertIsoDate(args.occurrenceDate, "Occurrence date");
    const tenancy = await ctx.db.get(args.tenancyId);
    if (!tenancy || tenancy.status !== "ACTIVE") throw new Error("Active tenancy not found");
    const access = await requirePlannerCompletionAccess(ctx, tenancy.siteId);
    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule || schedule.status !== "ACTIVE" || schedule.tenancyId !== tenancy._id) throw new Error("Active Special Scope schedule not found");
    const [item, template] = await Promise.all([ctx.db.get(schedule.scopeItemId), ctx.db.get(schedule.templateId)]);
    if (!item || item.status !== "ACTIVE" || !template || template.status !== "ACTIVE" || item.tenancyId !== tenancy._id || template.tenancyId !== tenancy._id || item.templateId !== template._id || schedule.templateId !== template._id) throw new Error("Special planner occurrence has an invalid parent relationship");
    if (schedule.completionMode !== "MANUAL") throw new Error("Automatic occurrences do not require manual completion");
    if (!isOccurrenceDate(schedule, args.occurrenceDate)) throw new Error("The selected date is not an occurrence of this schedule");
    const existing = await ctx.db.query("plannerCompletions").withIndex("by_tenancyId_and_specialScheduleId_and_occurrenceDate", (q) => q.eq("tenancyId", tenancy._id).eq("specialScheduleId", schedule._id).eq("occurrenceDate", args.occurrenceDate)).unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { completionModeSnapshot: schedule.completionMode, status: "COMPLETED", completedAt: now, completedBy: access.user._id, notes: cleanOptional(args.notes), voidedAt: undefined, voidedBy: undefined, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("plannerCompletions", { scopeType: "SPECIAL", companyId: tenancy.companyId, siteId: tenancy.siteId, tenancyId: tenancy._id, specialTemplateId: template._id, specialScopeItemId: item._id, specialScheduleId: schedule._id, occurrenceDate: args.occurrenceDate, completionModeSnapshot: schedule.completionMode, status: "COMPLETED", completedAt: now, completedBy: access.user._id, notes: cleanOptional(args.notes), createdAt: now, updatedAt: now });
  },
});

export const voidCompletion = mutation({
  args: { completionId: v.id("plannerCompletions") },
  returns: v.id("plannerCompletions"),
  handler: async (ctx, args) => {
    const completion = await ctx.db.get(args.completionId);
    if (!completion) throw new Error("Completion record not found");
    const access = await requirePlannerCompletionAccess(ctx, completion.siteId);
    const isSpecial = completion.scopeType === "SPECIAL";
    const [tenancy, schedule, scopeItem, template] = isSpecial
      ? await Promise.all([ctx.db.get(completion.tenancyId), ctx.db.get(completion.specialScheduleId), ctx.db.get(completion.specialScopeItemId), ctx.db.get(completion.specialTemplateId)])
      : await Promise.all([ctx.db.get(completion.tenancyId), ctx.db.get(completion.scheduleId), ctx.db.get(completion.scopeItemId), ctx.db.get(completion.templateId)]);
    if (
      !tenancy ||
      !schedule ||
      !scopeItem ||
      !template ||
      tenancy.siteId !== completion.siteId ||
      tenancy.companyId !== completion.companyId ||
      schedule.siteId !== completion.siteId ||
      schedule.scopeItemId !== scopeItem._id ||
      schedule.templateId !== template._id ||
      scopeItem.templateId !== template._id ||
      template.siteId !== completion.siteId
    ) {
      throw new Error("Completion record has an invalid parent relationship");
    }
    if (completion.status === "VOIDED") return completion._id;
    const now = Date.now();
    await ctx.db.patch(completion._id, {
      status: "VOIDED",
      voidedAt: now,
      voidedBy: access.user._id,
      updatedAt: now,
    });
    return completion._id;
  },
});

type PlannerFilters = {
  tenancyId?: Id<"tenancies">;
  category?: Doc<"siteScopeItems">["category"];
  frequency?: Doc<"siteScopeItemSchedules">["frequency"];
  scopeType?: "STANDARD" | "SPECIAL";
};

async function loadPlannerData(
  ctx: QueryCtx,
  siteId: Id<"sites">,
  filters: PlannerFilters,
  fromDate: string,
  toDate: string,
) {
  const template = await ctx.db
    .query("siteScopeTemplates")
    .withIndex("by_siteId_and_templateType_and_status", (q) =>
      q
        .eq("siteId", siteId)
        .eq("templateType", "STANDARD_TENANCY")
        .eq("status", "ACTIVE"),
    )
    .unique();
  const allTenancies = await ctx.db
    .query("tenancies")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .take(500);
  const activeTenancies = allTenancies.filter(
    (tenancy) => tenancy.status === "ACTIVE",
  );
  const tenancies = filters.tenancyId
    ? activeTenancies.filter((tenancy) => tenancy._id === filters.tenancyId)
    : activeTenancies;

  const [items, schedules, specialTemplates, completionRows] = await Promise.all([
    template ? ctx.db.query("siteScopeItems").withIndex("by_templateId_and_status", (q) => q.eq("templateId", template._id).eq("status", "ACTIVE")).take(500) : Promise.resolve([]),
    template ? ctx.db.query("siteScopeItemSchedules").withIndex("by_templateId_and_status", (q) => q.eq("templateId", template._id).eq("status", "ACTIVE")).take(1_000) : Promise.resolve([]),
    ctx.db.query("tenancyScopeTemplates").withIndex("by_siteId", (q) => q.eq("siteId", siteId)).take(500),
    ctx.db.query("plannerCompletions").withIndex("by_siteId_and_occurrenceDate", (q) => q.eq("siteId", siteId).gte("occurrenceDate", fromDate).lte("occurrenceDate", toDate)).take(10_000),
  ]);
  const standardItemById = new Map(items.filter((item) => !filters.category || item.category === filters.category).map((item) => [item._id, item]));
  const entries: PlannerEntry[] = [];
  if (filters.scopeType !== "SPECIAL") {
    for (const schedule of schedules) {
      const item = standardItemById.get(schedule.scopeItemId);
      if (item && (!filters.frequency || schedule.frequency === filters.frequency)) entries.push({ scopeType: "STANDARD", category: item.category, schedule, item, tenancies });
    }
  }
  if (filters.scopeType !== "STANDARD" && !filters.category) {
    const selectedTenancyIds = new Set(tenancies.map((tenancy) => tenancy._id));
    const activeSpecialTemplates = specialTemplates.filter((value) => value.status === "ACTIVE" && selectedTenancyIds.has(value.tenancyId));
    const specialGroups = await Promise.all(activeSpecialTemplates.map(async (specialTemplate) => {
      const [specialItems, specialSchedules] = await Promise.all([
        ctx.db.query("tenancyScopeItems").withIndex("by_templateId_and_status", (q) => q.eq("templateId", specialTemplate._id).eq("status", "ACTIVE")).take(500),
        ctx.db.query("tenancyScopeItemSchedules").withIndex("by_templateId_and_status", (q) => q.eq("templateId", specialTemplate._id).eq("status", "ACTIVE")).take(1000),
      ]);
      return { specialTemplate, specialItems, specialSchedules };
    }));
    const tenancyById = new Map(tenancies.map((tenancy) => [tenancy._id, tenancy]));
    for (const group of specialGroups) {
      const specialTenancy = tenancyById.get(group.specialTemplate.tenancyId);
      if (!specialTenancy) continue;
      const specialItemById = new Map(group.specialItems.map((item) => [item._id, item]));
      for (const schedule of group.specialSchedules) {
        const item = specialItemById.get(schedule.scopeItemId);
        if (item && (!filters.frequency || schedule.frequency === filters.frequency)) entries.push({ scopeType: "SPECIAL", category: "SPECIAL", schedule, item, tenancies: [specialTenancy] });
      }
    }
  }
  const allowedCompletionPairs = new Set(entries.flatMap((entry) => entry.tenancies.map((tenancy) => `${tenancy._id}:${entry.schedule._id}`)));
  const completions = new Map(
    completionRows
      .filter((completion) => {
        const scheduleId = completion.scopeType === "SPECIAL" ? completion.specialScheduleId : completion.scheduleId;
        return completion.status === "COMPLETED" && allowedCompletionPairs.has(`${completion.tenancyId}:${scheduleId}`);
      })
      .map((completion) => [
        completionKey(
          completion.tenancyId,
          completion.scopeType === "SPECIAL" ? completion.specialScheduleId : completion.scheduleId,
          completion.occurrenceDate,
        ),
        completion,
      ]),
  );

  return {
    allTenancies: activeTenancies,
    tenancies,
    entries,
    completions,
  };
}

function buildOccurrences(
  data: Awaited<ReturnType<typeof loadPlannerData>>,
  fromDate: string,
  toDate: string,
  today: string,
  maximum: number,
) {
  const result = [];
  let truncated = false;
  outer: for (
    let occurrenceDate = fromDate;
    occurrenceDate <= toDate;
    occurrenceDate = addDays(occurrenceDate, 1)
  ) {
    for (const entry of data.entries) {
      const { schedule, item } = entry;
      if (!isOccurrenceDate(schedule, occurrenceDate)) continue;
      for (const tenancy of entry.tenancies) {
        if (result.length >= maximum) {
          truncated = true;
          break outer;
        }
        const completion =
          data.completions.get(
            completionKey(tenancy._id, schedule._id, occurrenceDate),
          ) ?? null;
        const isAssumedComplete = schedule.completionMode === "AUTO";
        result.push({
          scopeType: entry.scopeType,
          occurrenceKey: `${tenancy._id}:${schedule._id}:${occurrenceDate}`,
          occurrenceDate,
          tenancyId: tenancy._id,
          tenancyName: tenancy.name,
          scopeItemId: item._id,
          scopeItemTitle: item.title,
          scheduleId: schedule._id,
          category: entry.category,
          frequency: schedule.frequency,
          recurrenceMode: schedule.recurrenceMode,
          completionMode: schedule.completionMode,
          isComplete: isAssumedComplete || completion !== null,
          isAssumedComplete,
          isOverdue:
            schedule.completionMode === "MANUAL" &&
            completion === null &&
            occurrenceDate < today,
          completion,
        });
      }
    }
  }
  const items = result.sort(
    (a, b) =>
      a.occurrenceDate.localeCompare(b.occurrenceDate) ||
      a.tenancyName.localeCompare(b.tenancyName) ||
      a.scopeItemTitle.localeCompare(b.scopeItemTitle),
  );
  return { items, truncated };
}

function completionKey(
  tenancyId: Id<"tenancies">,
  scheduleId: Id<"siteScopeItemSchedules"> | Id<"tenancyScopeItemSchedules">,
  occurrenceDate: string,
) {
  return `${tenancyId}:${scheduleId}:${occurrenceDate}`;
}

type PlannerEntry =
  | { scopeType: "STANDARD"; category: Doc<"siteScopeItems">["category"]; schedule: Doc<"siteScopeItemSchedules">; item: Doc<"siteScopeItems">; tenancies: Doc<"tenancies">[] }
  | { scopeType: "SPECIAL"; category: "SPECIAL"; schedule: Doc<"tenancyScopeItemSchedules">; item: Doc<"tenancyScopeItems">; tenancies: Doc<"tenancies">[] };

function validateRange(fromDate: string, toDate: string, maximumDays: number) {
  assertIsoDate(fromDate, "Start date");
  assertIsoDate(toDate, "End date");
  const length = daysBetween(fromDate, toDate);
  if (length < 0) throw new Error("Start date cannot be after end date");
  if (length + 1 > maximumDays) {
    throw new Error(`Date range cannot exceed ${maximumDays} days`);
  }
}
