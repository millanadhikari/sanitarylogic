# Convex Instructions

These instructions apply to files under /convex.

## Security

Every public query or mutation that accesses company/site/tenancy
data must perform backend authorization.

Never rely on frontend role checks.

Inspect and reuse helpers in:

lib/authorization.ts

before introducing new permission logic.

## Data Modeling

Use separate tables for operational records.

Do not embed growing operational arrays in Site or Tenancy records.

Use Convex IDs for relationships.

Validate that parent records belong to the expected company/site/
tenancy before writes.

## Deletion

Operational records should normally use soft deletion when other
records may reference them.

Use fields such as:

deletedAt: v.optional(v.number())

Queries shown to normal users should exclude deleted records.

## Money

Store monetary values as integer cents.

## Generated Files

Never manually modify:

_generated/

## After Changes

Run Convex codegen/typecheck or the appropriate repository command.

Fix generated API/type errors before declaring completion.