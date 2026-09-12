# Tenancy Workspace Instructions

This folder represents the individual tenancy operational workspace.

Current tab model:

- Overview
- Areas
- Work Orders
- Complaints
- Hazards
- Notes
- Periodic Planner

There is intentionally no Issues tab.

## Master vs Operational Data

Tenancy master data can be modified only by:

- SUPER_ADMIN
- AREA_MANAGER
- SITE_MANAGER

Operational modules may have broader permissions.

## Work Orders

Work Orders are a primary operational module.

Support existing functionality:

- create
- edit
- view details
- soft delete
- duplicate
- search
- status filtering
- date filtering
- quote
- notes
- resolution notes
- Work Order → Complaint relationship

Do not remove existing functionality when modifying this tab.

## Complaints

Support:

- create
- edit
- detail modal
- status changes
- soft delete
- comments
- comment author + timestamp
- comment deletion
- source Work Order display

Complaint comments should feel similar to a social comment thread.

## UI

Keep all tabs visually consistent.

Do not create a completely different visual style for individual
operational modules.