# Sanitary Logic Feature Implementation

## Purpose

Implement a new Sanitary Logic feature while preserving the
existing architecture, authorization model and design system.

## Workflow

1. Read root AGENTS.md.
2. Read any nested AGENTS.md applicable to the target files.
3. Inspect git status.
4. Inspect the current implementation before editing.
5. Identify:
   - schema changes
   - indexes
   - authorization
   - Convex queries
   - Convex mutations
   - generated API impacts
   - UI components
   - routes
6. Present a concise implementation plan.
7. Implement only the requested feature.
8. Do not refactor unrelated modules.
9. Run available type/lint/build checks.
10. Fix errors introduced by the change.
11. Report modified files and remaining limitations.

## Data Rules

- Backend authorization is mandatory.
- Use relationships rather than duplicated data when appropriate.
- Use soft deletion for operational records with history.
- Use cents for money.
- Do not manually edit Convex generated files.

## UI Rules

Inspect existing nearby UI and match it.

Preserve:
- rounded cards
- green accent
- mono labels
- responsive layout
- shadcn patterns
- existing route hierarchy

## Completion

Do not say the feature works unless checks were actually run.

Report any manual verification the user still needs to perform.

# Sanitary Logic Bug Fix

## Purpose

Diagnose and fix an existing bug with the smallest safe change.

## Workflow

1. Read applicable AGENTS.md files.
2. Inspect the exact error and affected source.
3. Reproduce or run a relevant check if possible.
4. Identify the root cause.
5. Change the smallest reasonable number of files.
6. Do not redesign or refactor unrelated code.
7. Preserve public APIs and routes unless they are the cause.
8. Run relevant checks.
9. Explain:
   - root cause
   - files changed
   - verification performed

## React

Check hook order when errors involve render behavior.

## Convex

Check:
- schema
- generated API
- validators
- authorization
- indexes

before assuming frontend code is wrong.

Never manually edit generated Convex files.