import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),

    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),

    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  companies: defineTable({
    name: v.string(),

    legalName: v.optional(v.string()),
    tradingName: v.optional(v.string()),
    abn: v.optional(v.string()),

    email: v.optional(v.string()),
    phone: v.optional(v.string()),

    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),

    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  companyMembers: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),

    role: v.union(
      v.literal("SUPER_ADMIN"),
      v.literal("AREA_MANAGER"),
      v.literal("SITE_MANAGER"),
      v.literal("SUPERVISOR"),
      v.literal("CLEANER"),
    ),

    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_company", ["companyId"])
    .index("by_user_and_company", ["userId", "companyId"]),

  sites: defineTable({
    companyId: v.id("companies"),

    name: v.string(),
    code: v.optional(v.string()),

    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    country: v.optional(v.string()),

    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"]),

  siteAssignments: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    userId: v.id("users"),

    role: v.union(
      v.literal("AREA_MANAGER"),
      v.literal("SITE_MANAGER"),
      v.literal("SUPERVISOR"),
      v.literal("CLEANER"),
    ),

    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_site", ["siteId"])
    .index("by_company", ["companyId"])
    .index("by_user_and_site", ["userId", "siteId"])
    .index("by_site_and_role", ["siteId", "role"]),

  invitations: defineTable({
    companyId: v.id("companies"),

    email: v.string(),

    role: v.union(
      v.literal("AREA_MANAGER"),
      v.literal("SITE_MANAGER"),
      v.literal("SUPERVISOR"),
      v.literal("CLEANER"),
    ),

    // Area Manager / Cleaner can have multiple.
    // Site Manager / Supervisor normally one.
    siteIds: v.array(v.id("sites")),

    clerkInvitationId: v.optional(v.string()),

    status: v.union(
      v.literal("PENDING"),
      v.literal("ACCEPTED"),
      v.literal("REVOKED"),
      v.literal("EXPIRED"),
    ),

    createdBy: v.id("users"),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_email", ["email"])
    .index("by_company_and_email", ["companyId", "email"])
    .index("by_clerk_invitation", ["clerkInvitationId"]),

  tenancies: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),

    name: v.string(),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    code: v.optional(v.string()),

    level: v.optional(v.string()),
    floor: v.optional(v.string()),
    unit: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),

    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_company", ["companyId"]),

  areas: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    tenancyId: v.id("tenancies"),

    name: v.string(),

    areaType: v.optional(v.string()),

    floor: v.optional(v.string()),

    description: v.optional(v.string()),

    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenancy", ["tenancyId"])
    .index("by_site", ["siteId"])
    .index("by_company", ["companyId"]),

  tenancyComplaints: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    tenancyId: v.id("tenancies"),

    title: v.string(),
    description: v.string(),

    category: v.optional(v.string()),
    sourceWorkOrderId: v.optional(v.id("workOrders")),
    deletedAt: v.optional(v.number()),
    priority: v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
      v.literal("URGENT"),
    ),

    status: v.union(
      v.literal("OPEN"),
      v.literal("IN_PROGRESS"),
      v.literal("RESOLVED"),
      v.literal("CLOSED"),
    ),

    createdBy: v.id("users"),

    resolvedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenancy", ["tenancyId"])
    .index("by_site", ["siteId"])
    .index("by_source_work_order", ["sourceWorkOrderId"])
    .index("by_company", ["companyId"]),
  complaintComments: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    tenancyId: v.id("tenancies"),
    complaintId: v.id("tenancyComplaints"),

    createdBy: v.id("users"),

    content: v.string(),

    deletedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_complaint", ["complaintId"])
    .index("by_tenancy", ["tenancyId"])
    .index("by_company", ["companyId"]),
  workOrders: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    tenancyId: v.id("tenancies"),

    // Client's work order/reference number
    workOrderNumber: v.string(),

    title: v.string(),

    description: v.string(),

    // Store money as cents
    quotedAmountCents: v.optional(v.number()),

    resolutionNotes: v.optional(v.string()),

    internalNotes: v.optional(v.string()),

    status: v.union(
      v.literal("OPEN"),
      v.literal("QUOTED"),
      v.literal("APPROVED"),
      v.literal("IN_PROGRESS"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED"),
    ),

    // Date supplied by / received from client
    workOrderDate: v.number(),

    completedAt: v.optional(v.number()),

    deletedAt: v.optional(v.number()),
    createdBy: v.id("users"),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenancy", ["tenancyId"])
    .index("by_tenancy_and_date", ["tenancyId", "workOrderDate"])
    .index("by_tenancy_and_number", ["tenancyId", "workOrderNumber"])
    .index("by_site", ["siteId"])
    .index("by_company", ["companyId"]),
});
