<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Sanitary Logic - Project Instructions

## Product

Sanitary Logic is a multi-tenant SaaS for commercial cleaning
and facilities operations.

The application manages:

Company
→ Sites
→ Tenancies
→ Areas

Operational modules include:

- Work Orders
- Complaints
- Hazards
- Notes
- Periodic Planner
- Cleaning Tasks
- Inspections
- Compliance
- Site Contacts
- Site Events
- Documents
- Photos / Evidence

Billing will be implemented later.

---

## Technology Stack

Current project stack:

- Next.js 16 App Router
- TypeScript
- React
- Convex
- Clerk
- Tailwind CSS v4
- shadcn/ui
- lucide-react
- sonner

Authentication is handled by Clerk.

Application data and application authorization are handled by Convex.

Do not introduce another database, ORM, authentication system,
or backend framework unless explicitly requested.

---

## Authentication

Clerk is responsible for authentication.

This project uses Clerk Core 3 APIs.

Do not introduce deprecated Clerk components or APIs.

Do not use old:

- SignedIn
- SignedOut
- Protect

Server route protection uses Clerk server auth APIs.

Convex receives Clerk identity through ConvexProviderWithClerk.

Clerk Organizations are NOT the application's source of truth
for companies or roles.

---

## Authorization

Convex backend authorization is the security boundary.

Frontend visibility checks are UX only and must never be treated
as sufficient authorization.

Important authorization helpers live in:

convex/lib/authorization.ts

Before implementing a mutation, inspect and reuse the appropriate
authorization helper.

Do not duplicate authorization rules in random Convex files.

---

## Roles

Supported roles:

SUPER_ADMIN
AREA_MANAGER
SITE_MANAGER
SUPERVISOR
CLEANER

### SUPER_ADMIN

- Company-wide access.
- Can manage sites.
- Can manage tenancies.
- Can manage company employees.
- Can manage operational modules.

### AREA_MANAGER

- Assigned to one or more sites.
- Can view/manage assigned sites.
- Can manage tenancy master data at assigned sites.
- Can manage operational modules.

### SITE_MANAGER

- Usually assigned to one site.
- Can manage tenancy master data at the assigned site.
- Can manage operational modules.

### SUPERVISOR

- Operational role.
- Usually assigned to one site.
- Must not edit site or tenancy master data.
- May manage operational modules such as Work Orders.

### CLEANER

- Operational/mobile-first user.
- Restricted access.
- Must not edit site or tenancy master data.
- Additional task/reporting permissions will be introduced later.

Do not expand role permissions without explicit instruction.

---

## Company Membership and Site Access

companyMembers determines:

- company membership
- primary company role

siteAssignments determines:

- which sites a non-super-admin employee can access

SUPER_ADMIN has company-wide site access and does not require
siteAssignments for every site.

Every employee should have a companyMembers record.

---

## Main Data Hierarchy

The intended domain hierarchy is:

Company
└── Site
    └── Tenancy
        └── Area

Operational records should reference this hierarchy using IDs.

Avoid putting changing operational records directly on master
data documents.

For example:

Do NOT put complaint history, notes, hazards, or work orders as
arrays directly inside the tenancy document.

Use separate Convex tables.

---

## Site Master Data

A Site is the physical commercial property/building.

Site master information may include:

- name
- code
- address
- suburb
- state
- postcode
- country
- status

Future separate site modules may include:

- siteContacts
- siteEvents
- siteInstructions
- siteDocuments
- siteNotes
- siteHazards

Do not add large operational arrays directly to sites.

---

## Tenancy Master Data

Tenancies belong to Sites.

Master tenancy information includes:

- companyId
- siteId
- name
- floor
- contactName
- contactEmail
- contactPhone
- description
- status
- createdAt
- updatedAt

Only the following roles may modify tenancy master data:

- SUPER_ADMIN
- AREA_MANAGER
- SITE_MANAGER

SUPERVISOR and CLEANER must not modify tenancy master data.

---

## Areas

Areas belong to Tenancies.

Examples:

- Reception
- Office
- Meeting Room
- Kitchen
- Bathroom
- Common Area
- Storage

Use `areaType`, not `type`, for the area classification field.

Areas should use soft/archive status rather than destructive
hard deletion when operational history may depend on them.

---

## Work Orders

Work Orders belong to a Tenancy.

Work Order fields currently include:

- companyId
- siteId
- tenancyId
- workOrderNumber
- title
- description
- quotedAmountCents
- resolutionNotes
- internalNotes
- status
- workOrderDate
- completedAt
- createdBy
- deletedAt
- createdAt
- updatedAt

Money must be stored in cents.

Example:

$125.50 => 12550

Do not store currency values using floating point dollars.

Supported Work Order statuses:

- OPEN
- QUOTED
- APPROVED
- IN_PROGRESS
- COMPLETED
- CANCELLED

Work Orders use soft deletion.

Work Order numbers should be unique within the same tenancy
for active/non-deleted records.

Work Orders support:

- create
- edit
- soft delete
- search
- status filtering
- date range filtering
- duplicate
- linked complaint creation

Roles that may manage Work Orders:

- SUPER_ADMIN
- AREA_MANAGER
- SITE_MANAGER
- SUPERVISOR

Cleaner access is currently read-only unless explicitly changed.

---

## Complaints

Complaints belong to a Tenancy.

Complaint fields include:

- companyId
- siteId
- tenancyId
- sourceWorkOrderId optional
- title
- description
- category
- priority
- status
- createdBy
- resolvedAt
- deletedAt
- createdAt
- updatedAt

Priorities:

- LOW
- MEDIUM
- HIGH
- URGENT

Statuses:

- OPEN
- IN_PROGRESS
- RESOLVED
- CLOSED

Complaints use soft deletion.

A complaint created from a Work Order must preserve the relationship
using `sourceWorkOrderId`.

Do not merely duplicate unrelated text when an ID relationship
should be maintained.

---

## Complaint Comments

Complaint comments are separate records.

They behave similarly to social-network comments.

Each comment contains:

- complaintId
- tenancyId
- siteId
- companyId
- createdBy
- content
- createdAt
- updatedAt
- deletedAt optional

The UI should show:

- author name
- author initials/avatar when available
- date/time
- content

Comments use soft deletion.

A user may delete their own comment.

SUPER_ADMIN, AREA_MANAGER and SITE_MANAGER may delete comments
created by other users.

Do not embed comments as an array inside the Complaint record.

---

## Future Requests Module

Requests are planned but not yet fully implemented.

Intended workflow:

Client Request
→ Quote if required
→ Approval
→ Work Order
→ Completion

Requests should eventually be linkable to Work Orders.

Do not implement Requests unless explicitly asked.

---

## Periodic Planner

Periodic Planner is planned for recurring work such as:

- carpet cleaning
- window cleaning
- floor maintenance
- high dusting
- deep cleaning

Future records may include:

- tenancy
- area
- recurrence/frequency
- next due date
- assigned user/team
- completion history
- evidence/photos
- generated Work Orders

Do not implement recurrence architecture casually.
Inspect existing Work Order patterns before implementation.

---

## Main Routes

Sites list:

/dashboard/sites

Individual Site:

/dashboard/sites/[siteId]

Tenancies for Site:

/dashboard/sites/[siteId]/tenancies

Individual Tenancy workspace:

/dashboard/sites/[siteId]/tenancies/[tenancyId]

Do not create duplicate parallel routes for these entities unless
explicitly requested.

---

## Tenancy Workspace

The individual tenancy page is an operational workspace.

Current/planned tabs:

- Overview
- Areas
- Work Orders
- Complaints
- Hazards
- Notes
- Periodic Planner

Do not restore the old Issues tab.

Work Orders replaced Issues for the current product design.

---

## UI Design System

Preserve the existing Sanitary Logic visual design.

General characteristics:

- professional B2B SaaS
- clean technical aesthetic
- green primary accent
- neutral/white surfaces
- rounded-2xl cards
- subtle borders
- restrained shadows
- generous whitespace
- responsive layouts
- Geist
- Geist Mono
- uppercase mono-style labels
- lucide icons
- shadcn/ui primitives

Existing utility classes include patterns such as:

- label-caps
- label-mono
- form-input
- shadow-card
- grid-canvas

Do not redesign established screens unless explicitly requested.

When adding a new screen, inspect an existing screen first and
reuse its design patterns.

---

## React Rules

Follow React hook rules strictly.

All hooks must be called before conditional early returns.

Never introduce code like:

if (data === undefined) {
  return ...
}

const mutation = useMutation(...)

Instead:

1. declare useQuery
2. declare useMutation
3. declare useState
4. declare useMemo/useEffect
5. only then perform early returns

This project previously encountered:
"Rendered more hooks than during the previous render."

Avoid repeating this issue.

---

## Convex Rules

Before creating or modifying Convex code:

1. Inspect `convex/schema.ts`.
2. Inspect relevant authorization helpers.
3. Reuse generated `Id<>` and `Doc<>` types.
4. Prefer indexed queries where appropriate.
5. Validate parent relationships.
6. Enforce authorization inside mutations/queries.
7. Use soft deletion when operational history may reference records.

After modifying Convex:

- allow Convex codegen/typecheck to complete
- check generated API types
- fix all Convex TypeScript errors

Never manually edit files under:

convex/_generated/

---

## Editing Rules

Before changing a feature:

1. Inspect the existing implementation.
2. Identify all files involved.
3. Explain the proposed changes briefly.
4. Modify the smallest reasonable number of files.
5. Preserve existing working behavior.
6. Do not refactor unrelated code.
7. Do not rename public routes or Convex functions without need.
8. Do not delete functionality without explicit instruction.

For bug fixes, fix the root cause rather than rewriting the feature.

---

## Verification

After meaningful code changes, run the relevant checks available
in the repository.

Typical checks may include:

npm run lint
npx tsc --noEmit
npx convex dev

Use the actual scripts in package.json rather than assuming a
script exists.

If running a persistent dev command is inappropriate, use an
available one-shot typecheck/build command instead.

Report:

- files modified
- important decisions
- commands run
- errors remaining

Do not claim a check passed unless it was actually run.

---

## Git Safety

Do not:

- force push
- reset --hard
- delete branches
- overwrite user changes
- commit automatically

unless explicitly instructed.

Before large modifications, inspect git status.

If unrelated uncommitted changes exist, preserve them.

---

## General Working Style

Prefer direct implementation over speculative rewrites.

For large features:

1. inspect
2. plan
3. implement incrementally
4. typecheck/test
5. report

When requirements are ambiguous and changing the data model would
be expensive, ask before committing to a structural decision.

For small implementation details, make a reasonable choice that
matches existing project patterns.

## Periodic Planner

Periodic Planner is a Site-level operational module.

The Standard Tenancy Scope belongs to the Site and is inherited
by all active Tenancies at that Site.

Do not duplicate the standard scope definition separately for
every Tenancy.

The architecture separates:

1. Scope definitions
2. Schedule rules
3. Per-tenancy completion records

A single scope item may have multiple schedule rules.

For example, one task may have both DAILY and BI_WEEKLY schedules.

Core tables:

- siteScopeTemplates
- siteScopeItems
- siteScopeItemSchedules
- plannerCompletions

Standard scope categories currently come from the supplied
Standard Tenancy Clean specification:

- WASTE
- CARPETED_FLOORS
- HARD_FLOORS
- TENANCY_AREA
- KITCHEN

Supported frequencies:

- DAILY
- BI_WEEKLY
- WEEKLY
- MONTHLY
- QUARTERLY
- BI_ANNUAL
- ANNUAL
- SITE_DETERMINED

Default completion behaviour:

- DAILY: AUTO
- BI_WEEKLY: AUTO
- WEEKLY: AUTO
- MONTHLY: MANUAL
- QUARTERLY: MANUAL
- BI_ANNUAL: MANUAL
- ANNUAL: MANUAL
- SITE_DETERMINED: MANUAL

These defaults may later be overridden per schedule.

Do not create millions of future daily occurrence records.

Recurring rules determine what is scheduled.

Store explicit completion/exception records where required.

The planner must support:

- Site-level Standard Scope
- All-tenancy inheritance
- Year view
- Month calendar view
- List view
- filtering by Tenancy
- filtering by category
- filtering by frequency
- manual completion for periodic items
- history foundation

Special Tenancy Scope will be implemented later.

Do not implement Special Scope in Phase 1.

The tenancy Periodic Planner tab will later show inherited
Standard Scope plus tenant-specific Special Scope.

Do not implement automatic Work Order generation in Phase 1.

