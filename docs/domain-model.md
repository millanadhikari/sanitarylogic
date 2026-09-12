# Domain Model

## Company

Top-level customer account.

## Site

Physical building/property managed by the cleaning company.

## Tenancy

Occupant/client/business inside a Site.

Example:

Site: Commercial Tower Sydney
Tenancy: Australian Military Bank
Floor: Level 1

## Area

Cleaning zone within a Tenancy.

Examples:

Reception
Kitchen
Bathroom
Meeting Room

## Work Order

Client-authorized or operational work item.

May include:

client reference
quote
description
notes
resolution
status
received date

## Complaint

Service complaint associated with a Tenancy.

May originate from a Work Order.

## Complaint Comment

Chronological communication/update attached to a Complaint.

## Future Request

Client asks for additional work.

May lead to a quote and Work Order.

## Periodic Plan

Recurring work definition that may eventually generate Work Orders.
