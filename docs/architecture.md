# Sanitary Logic Architecture

## Frontend

Next.js App Router.

Main application is under `/app/dashboard`.

Shared UI lives under `/components`.

## Authentication

Clerk authenticates users.

Clerk user IDs are synchronized into Convex users.

## Backend

Convex provides:

- persistence
- queries
- mutations
- authorization
- webhooks

## Authorization hierarchy

User
→ companyMembers
→ company
→ siteAssignments
→ site access

SUPER_ADMIN receives company-wide access.

Other operational roles require site assignments.

## Primary domain hierarchy

Company
→ Site
→ Tenancy
→ Area

Operational tables reference appropriate parent IDs.

## Principle

Master records describe entities.

Operational records describe activity around those entities.

Do not mix these concerns unnecessarily.