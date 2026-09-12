# Dashboard UI Instructions

These instructions apply to dashboard routes.

Preserve the existing Sanitary Logic design language.

Use existing shared components and Tailwind utilities before
creating replacements.

Do not introduce a second visual design system.

## Route Hierarchy

/dashboard/sites
/dashboard/sites/[siteId]
/dashboard/sites/[siteId]/tenancies
/dashboard/sites/[siteId]/tenancies/[tenancyId]

Do not flatten this hierarchy.

## Permissions

Frontend role checks are only UX.

Do not assume hiding a button provides security.

Any privileged action must also be authorized by Convex.

## Modals

Use existing modal patterns where possible.

Modals should include:

- clear heading
- short context
- validation feedback
- Cancel
- explicit primary action

Destructive actions require confirmation.

## React Hooks

All hooks must run before early returns.

Do not conditionally call hooks.