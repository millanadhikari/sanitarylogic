import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const siteScopeCategory = v.union(
  v.literal("WASTE"),
  v.literal("CARPETED_FLOORS"),
  v.literal("HARD_FLOORS"),
  v.literal("TENANCY_AREA"),
  v.literal("KITCHEN"),
);

const plannerCompletionMode = v.union(
  v.literal("AUTO"),
  v.literal("MANUAL"),
);

const plannerWeekday = v.union(
  v.literal(0),
  v.literal(1),
  v.literal(2),
  v.literal(3),
  v.literal(4),
  v.literal(5),
  v.literal(6),
);

const activeStatus = v.union(v.literal("ACTIVE"), v.literal("INACTIVE"));

const specialScopeSchedule = v.union(
  v.object({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    tenancyId: v.id("tenancies"),
    templateId: v.id("tenancyScopeTemplates"),
    scopeItemId: v.id("tenancyScopeItems"),
    sourceScheduleKey: v.optional(v.string()),
    frequency: v.union(
      v.literal("DAILY"),
      v.literal("TWICE_WEEKLY"),
      v.literal("WEEKLY"),
      v.literal("MONTHLY"),
      v.literal("QUARTERLY"),
      v.literal("BI_ANNUAL"),
      v.literal("ANNUAL"),
    ),
    recurrenceMode: v.literal("RECURRING"),
    completionMode: plannerCompletionMode,
    startsOn: v.string(),
    endsOn: v.optional(v.string()),
    weekdays: v.optional(v.array(plannerWeekday)),
    status: activeStatus,
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  v.object({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    tenancyId: v.id("tenancies"),
    templateId: v.id("tenancyScopeTemplates"),
    scopeItemId: v.id("tenancyScopeItems"),
    sourceScheduleKey: v.optional(v.string()),
    frequency: v.literal("SITE_DETERMINED"),
    recurrenceMode: v.literal("MANUAL_DATE"),
    completionMode: v.literal("MANUAL"),
    scheduledFor: v.string(),
    status: activeStatus,
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
);

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

  employees: defineTable({
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    employeeNumber: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    employmentType: v.union(
      v.literal("FULL_TIME"),
      v.literal("PART_TIME"),
      v.literal("CASUAL"),
      v.literal("CONTRACTOR"),
    ),
    startDate: v.optional(v.number()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    emergencyContactRelationship: v.optional(v.string()),
    address: v.optional(v.string()),
    suburb: v.optional(v.string()),
    state: v.optional(v.string()),
    postcode: v.optional(v.string()),
    notes: v.optional(v.string()),
    profileImageStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("ACTIVE"),
      v.literal("INACTIVE"),
      v.literal("TERMINATED"),
    ),
    createdBy: v.id("users"),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_company_and_status", ["companyId", "status"])
    .index("by_user", ["userId"])
    .index("by_company_and_employeeNumber", ["companyId", "employeeNumber"])
    .index("by_company_and_email", ["companyId", "email"]),

  employeeSiteAssignments: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    employeeId: v.id("employees"),
    assignmentRole: v.union(
      v.literal("CLEANER"),
      v.literal("SUPERVISOR"),
      v.literal("OTHER"),
    ),
    isPrimarySite: v.boolean(),
    status: activeStatus,
    assignedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_employee", ["employeeId"])
    .index("by_employee_and_site", ["employeeId", "siteId"])
    .index("by_company", ["companyId"]),

  employeeShiftPatterns: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    employeeId: v.id("employees"),
    patternSetKey: v.string(),
    name: v.optional(v.string()),
    shiftType: v.union(
      v.literal("DAY"),
      v.literal("NIGHT"),
      v.literal("OTHER"),
    ),
    dayOfWeek: plannerWeekday,
    startTime: v.string(),
    endTime: v.string(),
    breakMinutes: v.number(),
    effectiveFrom: v.string(),
    effectiveTo: v.optional(v.string()),
    status: activeStatus,
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_employee", ["employeeId"])
    .index("by_site_and_status", ["siteId", "status"])
    .index("by_employee_and_status", ["employeeId", "status"])
    .index("by_site_and_patternSetKey", ["siteId", "patternSetKey"]),

  rosterShifts: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    employeeId: v.id("employees"),
    workDate: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    breakMinutes: v.number(),
    shiftType: v.union(
      v.literal("DAY"),
      v.literal("NIGHT"),
      v.literal("OTHER"),
    ),
    shiftSource: v.union(
      v.literal("CASUAL"),
      v.literal("ADDITIONAL"),
      v.literal("REPLACEMENT"),
      v.literal("OVERRIDE"),
    ),
    relatedPatternId: v.optional(v.id("employeeShiftPatterns")),
    replacesEmployeeId: v.optional(v.id("employees")),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.union(v.literal("SCHEDULED"), v.literal("CANCELLED")),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_site_and_workDate", ["siteId", "workDate"])
    .index("by_employee_and_workDate", ["employeeId", "workDate"])
    .index("by_relatedPattern_and_workDate", ["relatedPatternId", "workDate"])
    .index("by_site_and_status", ["siteId", "status"]),

  siteTimesheetSettings: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    periodType: v.union(
      v.literal("WEEKLY"),
      v.literal("FORTNIGHTLY"),
      v.literal("MONTHLY"),
    ),
    weekStartsOn: plannerWeekday,
    fortnightAnchorDate: v.optional(v.string()),
    status: activeStatus,
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_company", ["companyId"]),

  employeeTimesheets: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    employeeId: v.id("employees"),
    periodType: v.union(
      v.literal("WEEKLY"),
      v.literal("FORTNIGHTLY"),
      v.literal("MONTHLY"),
    ),
    periodStart: v.string(),
    periodEnd: v.string(),
    status: v.union(
      v.literal("DRAFT"),
      v.literal("SUBMITTED"),
      v.literal("APPROVED"),
      v.literal("REJECTED"),
    ),
    submittedAt: v.optional(v.number()),
    submittedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    rejectedAt: v.optional(v.number()),
    rejectedBy: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
    reopenedAt: v.optional(v.number()),
    reopenedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site_and_period", ["siteId", "periodStart", "periodEnd"])
    .index("by_employee", ["employeeId"])
    .index("by_employee_and_period", ["employeeId", "siteId", "periodStart", "periodEnd"])
    .index("by_site_and_status", ["siteId", "status"]),

  timesheetEntries: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    employeeId: v.id("employees"),
    timesheetId: v.id("employeeTimesheets"),
    workDate: v.string(),
    sourceKey: v.string(),
    sourceType: v.union(
      v.literal("PERMANENT_PATTERN"),
      v.literal("ROSTER_SHIFT"),
      v.literal("UNSCHEDULED"),
    ),
    sourcePatternId: v.optional(v.id("employeeShiftPatterns")),
    sourceRosterShiftId: v.optional(v.id("rosterShifts")),
    shiftType: v.optional(v.union(
      v.literal("DAY"),
      v.literal("NIGHT"),
      v.literal("OTHER"),
    )),
    scheduledStart: v.optional(v.string()),
    scheduledEnd: v.optional(v.string()),
    scheduledBreakMinutes: v.optional(v.number()),
    scheduledMinutes: v.optional(v.number()),
    actualStart: v.optional(v.string()),
    actualEnd: v.optional(v.string()),
    actualBreakMinutes: v.optional(v.number()),
    actualMinutes: v.optional(v.number()),
    varianceMinutes: v.optional(v.number()),
    attendanceType: v.union(
      v.literal("WORKED"),
      v.literal("SICK_LEAVE"),
      v.literal("ANNUAL_LEAVE"),
      v.literal("PERSONAL_LEAVE"),
      v.literal("LEAVE_WITHOUT_PAY"),
      v.literal("ABSENT"),
    ),
    replacementEmployeeId: v.optional(v.id("employees")),
    replacementRosterShiftId: v.optional(v.id("rosterShifts")),
    leaveNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_timesheet", ["timesheetId"])
    .index("by_timesheet_and_sourceKey", ["timesheetId", "sourceKey"])
    .index("by_employee_and_workDate", ["employeeId", "workDate"])
    .index("by_site_and_workDate", ["siteId", "workDate"]),

  onboardingTemplates: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
    status: activeStatus,
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"]),

  siteContacts: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    name: v.string(),
    jobTitle: v.optional(v.string()),
    organisation: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_company", ["companyId"]),

  siteDocuments: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    title: v.string(),
    description: v.optional(v.string()),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.optional(v.string()),
    fileSize: v.number(),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_company", ["companyId"]),

  onboardingTemplateItems: defineTable({
    companyId: v.id("companies"),
    templateId: v.id("onboardingTemplates"),
    title: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    required: v.boolean(),
    status: activeStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_template", ["templateId"])
    .index("by_company", ["companyId"]),

  employeeOnboardingItems: defineTable({
    companyId: v.id("companies"),
    employeeId: v.id("employees"),
    templateId: v.id("onboardingTemplates"),
    templateItemId: v.id("onboardingTemplateItems"),
    title: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    required: v.boolean(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("COMPLETED"),
      v.literal("NOT_APPLICABLE"),
    ),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employee", ["employeeId"])
    .index("by_template", ["templateId"])
    .index("by_employee_and_template", ["employeeId", "templateId"])
    .index("by_templateItem", ["templateItemId"])
    .index("by_employee_and_templateItem", ["employeeId", "templateItemId"])
    .index("by_company", ["companyId"]),

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

  siteScopeTemplates: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    templateType: v.literal("STANDARD_TENANCY"),
    sourceTemplateKey: v.literal("STANDARD_TENANCY_CLEAN"),
    sourceTemplateVersion: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    timeZone: v.string(),
    status: activeStatus,
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_siteId", ["siteId"])
    .index("by_siteId_and_templateType_and_status", [
      "siteId",
      "templateType",
      "status",
    ]),

  siteScopeItems: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    templateId: v.id("siteScopeTemplates"),
    sourceItemKey: v.optional(v.string()),
    category: siteScopeCategory,
    title: v.string(),
    description: v.optional(v.string()),
    instructions: v.optional(v.string()),
    sortOrder: v.number(),
    status: activeStatus,
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_siteId", ["siteId"])
    .index("by_templateId", ["templateId"])
    .index("by_templateId_and_status", ["templateId", "status"])
    .index("by_templateId_and_category", ["templateId", "category"])
    .index("by_templateId_and_category_and_status", [
      "templateId",
      "category",
      "status",
    ]),

  siteScopeItemSchedules: defineTable(
    v.union(
      v.object({
        companyId: v.id("companies"),
        siteId: v.id("sites"),
        templateId: v.id("siteScopeTemplates"),
        scopeItemId: v.id("siteScopeItems"),
        sourceScheduleKey: v.optional(v.string()),
        frequency: v.union(
          v.literal("DAILY"),
          v.literal("TWICE_WEEKLY"),
          v.literal("WEEKLY"),
          v.literal("MONTHLY"),
          v.literal("QUARTERLY"),
          v.literal("BI_ANNUAL"),
          v.literal("ANNUAL"),
        ),
        recurrenceMode: v.literal("RECURRING"),
        completionMode: plannerCompletionMode,
        startsOn: v.string(),
        endsOn: v.optional(v.string()),
        weekdays: v.optional(v.array(plannerWeekday)),
        status: activeStatus,
        createdBy: v.id("users"),
        updatedBy: v.id("users"),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
      v.object({
        companyId: v.id("companies"),
        siteId: v.id("sites"),
        templateId: v.id("siteScopeTemplates"),
        scopeItemId: v.id("siteScopeItems"),
        sourceScheduleKey: v.optional(v.string()),
        frequency: v.literal("SITE_DETERMINED"),
        recurrenceMode: v.literal("MANUAL_DATE"),
        completionMode: v.literal("MANUAL"),
        scheduledFor: v.string(),
        status: activeStatus,
        createdBy: v.id("users"),
        updatedBy: v.id("users"),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  )
    .index("by_siteId", ["siteId"])
    .index("by_scopeItemId", ["scopeItemId"])
    .index("by_scopeItemId_and_status", ["scopeItemId", "status"])
    .index("by_templateId_and_status", ["templateId", "status"])
    .index("by_siteId_and_frequency_and_status", [
      "siteId",
      "frequency",
      "status",
    ]),

  tenancyScopeTemplates: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    tenancyId: v.id("tenancies"),
    templateType: v.literal("SPECIAL_TENANCY"),
    sourceTemplateKey: v.literal("SPECIAL_TENANCY_SERVICES"),
    sourceTemplateVersion: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    timeZone: v.string(),
    status: activeStatus,
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_siteId", ["siteId"])
    .index("by_tenancyId", ["tenancyId"])
    .index("by_tenancyId_and_templateType_and_status", [
      "tenancyId",
      "templateType",
      "status",
    ]),

  tenancyScopeItems: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    tenancyId: v.id("tenancies"),
    templateId: v.id("tenancyScopeTemplates"),
    sourceServiceKey: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    instructions: v.optional(v.string()),
    sortOrder: v.number(),
    status: activeStatus,
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_siteId", ["siteId"])
    .index("by_tenancyId", ["tenancyId"])
    .index("by_templateId", ["templateId"])
    .index("by_templateId_and_status", ["templateId", "status"]),

  tenancyScopeItemSchedules: defineTable(specialScopeSchedule)
    .index("by_siteId", ["siteId"])
    .index("by_tenancyId", ["tenancyId"])
    .index("by_scopeItemId", ["scopeItemId"])
    .index("by_scopeItemId_and_status", ["scopeItemId", "status"])
    .index("by_templateId_and_status", ["templateId", "status"])
    .index("by_siteId_and_frequency_and_status", [
      "siteId",
      "frequency",
      "status",
    ]),

  plannerCompletions: defineTable(
    v.union(
      v.object({
        scopeType: v.optional(v.literal("STANDARD")),
        companyId: v.id("companies"),
        siteId: v.id("sites"),
        tenancyId: v.id("tenancies"),
        templateId: v.id("siteScopeTemplates"),
        scopeItemId: v.id("siteScopeItems"),
        scheduleId: v.id("siteScopeItemSchedules"),
        occurrenceDate: v.string(),
        completionModeSnapshot: plannerCompletionMode,
        status: v.union(v.literal("COMPLETED"), v.literal("VOIDED")),
        completedAt: v.number(),
        completedBy: v.optional(v.id("users")),
        notes: v.optional(v.string()),
        voidedAt: v.optional(v.number()),
        voidedBy: v.optional(v.id("users")),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
      v.object({
        scopeType: v.literal("SPECIAL"),
        companyId: v.id("companies"),
        siteId: v.id("sites"),
        tenancyId: v.id("tenancies"),
        specialTemplateId: v.id("tenancyScopeTemplates"),
        specialScopeItemId: v.id("tenancyScopeItems"),
        specialScheduleId: v.id("tenancyScopeItemSchedules"),
        occurrenceDate: v.string(),
        completionModeSnapshot: plannerCompletionMode,
        status: v.union(v.literal("COMPLETED"), v.literal("VOIDED")),
        completedAt: v.number(),
        completedBy: v.optional(v.id("users")),
        notes: v.optional(v.string()),
        voidedAt: v.optional(v.number()),
        voidedBy: v.optional(v.id("users")),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  )
    .index("by_scheduleId_and_occurrenceDate", [
      "scheduleId",
      "occurrenceDate",
    ])
    .index("by_scopeItemId_and_occurrenceDate", [
      "scopeItemId",
      "occurrenceDate",
    ])
    .index("by_siteId_and_occurrenceDate", ["siteId", "occurrenceDate"])
    .index("by_tenancyId_and_occurrenceDate", [
      "tenancyId",
      "occurrenceDate",
    ])
    .index("by_tenancyId_and_scheduleId_and_occurrenceDate", [
      "tenancyId",
      "scheduleId",
      "occurrenceDate",
    ])
    .index("by_siteId_and_completedAt", ["siteId", "completedAt"])
    .index("by_tenancyId_and_completedAt", ["tenancyId", "completedAt"])
    .index("by_scopeItemId_and_completedAt", ["scopeItemId", "completedAt"])
    .index("by_specialScheduleId_and_occurrenceDate", [
      "specialScheduleId",
      "occurrenceDate",
    ])
    .index("by_tenancyId_and_specialScheduleId_and_occurrenceDate", [
      "tenancyId",
      "specialScheduleId",
      "occurrenceDate",
    ])
    .index("by_specialScopeItemId_and_completedAt", [
      "specialScopeItemId",
      "completedAt",
    ]),

  assets: defineTable({
    companyId: v.id("companies"),
    siteId: v.id("sites"),
    assetName: v.string(),
    assetCode: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    assetType: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    location: v.optional(v.string()),
    purchaseDate: v.optional(v.string()),
    purchasePriceCents: v.optional(v.number()),
    status: v.union(v.literal("ACTIVE"), v.literal("OUT_OF_SERVICE"), v.literal("DISPOSED"), v.literal("ARCHIVED")),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_companyId", ["companyId"])
    .index("by_siteId", ["siteId"])
    .index("by_siteId_and_status", ["siteId", "status"])
    .index("by_siteId_and_serialNumber", ["siteId", "serialNumber"]),

  assetTestAndTagRecords: defineTable({
    companyId: v.id("companies"), siteId: v.id("sites"), assetId: v.id("assets"),
    testDate: v.string(), nextTestDueDate: v.optional(v.string()),
    result: v.union(v.literal("PASS"), v.literal("FAIL"), v.literal("REQUIRES_ACTION")),
    tagNumber: v.optional(v.string()), testedByName: v.optional(v.string()), testerCompany: v.optional(v.string()), notes: v.optional(v.string()),
    createdBy: v.id("users"), updatedBy: v.id("users"), createdAt: v.number(), updatedAt: v.number(), deletedAt: v.optional(v.number()),
  })
    .index("by_siteId", ["siteId"])
    .index("by_assetId", ["assetId"])
    .index("by_assetId_and_testDate", ["assetId", "testDate"]),

  assetMaintenanceRecords: defineTable({
    companyId: v.id("companies"), siteId: v.id("sites"), assetId: v.id("assets"),
    maintenanceDate: v.string(),
    maintenanceType: v.union(v.literal("SERVICE"), v.literal("REPAIR"), v.literal("INSPECTION"), v.literal("PREVENTIVE"), v.literal("OTHER")),
    description: v.string(), serviceProvider: v.optional(v.string()), technicianName: v.optional(v.string()), costCents: v.optional(v.number()), nextMaintenanceDueDate: v.optional(v.string()),
    status: v.union(v.literal("COMPLETED"), v.literal("REQUIRES_FOLLOW_UP")), notes: v.optional(v.string()),
    createdBy: v.id("users"), updatedBy: v.id("users"), createdAt: v.number(), updatedAt: v.number(), deletedAt: v.optional(v.number()),
  })
    .index("by_siteId", ["siteId"])
    .index("by_assetId", ["assetId"])
    .index("by_assetId_and_maintenanceDate", ["assetId", "maintenanceDate"]),

  assetPhotos: defineTable({
    companyId: v.id("companies"), siteId: v.id("sites"), assetId: v.id("assets"), storageId: v.id("_storage"),
    fileName: v.optional(v.string()), caption: v.optional(v.string()), uploadedBy: v.id("users"), createdAt: v.number(), deletedAt: v.optional(v.number()),
  })
    .index("by_siteId", ["siteId"])
    .index("by_assetId", ["assetId"]),
});
