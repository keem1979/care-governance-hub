# Architecture

## Overview

Care Governance Hub is a modular Next.js application backed by PostgreSQL. The
browser receives minimal display data. Authentication, membership resolution,
permissions, and tenant filtering run on the server.

```text
Browser
  -> Next.js proxy (optimistic signed-cookie check)
  -> Server Component or Route Handler
  -> Auth data-access layer (database session + active membership)
  -> Permission guard
  -> Tenant-scoped Prisma query
  -> PostgreSQL
```

The proxy improves navigation behaviour but is not the security boundary. The data
access layer verifies that the session exists, is not revoked or expired, the user
is active, and an active organisation membership exists.

## Milestone 1 decisions

- **Database-backed sessions with a signed cookie.** The cookie contains only user,
  session, and expiry identifiers. Current roles and tenant scope are loaded from
  PostgreSQL on each server render, so access changes take effect without waiting
  for the cookie to expire.
- **Global system roles, organisation-scoped memberships.** Default role definitions
  are consistent across tenants. A membership binds one user and role to exactly one
  organisation and either all or named locations.
- **Central permission keys.** `src/lib/permissions.ts` is the source of truth.
  Routes and later domain services call shared guards rather than comparing role
  labels.
- **Relational tenancy.** Organisation and location foreign keys are explicit.
  `src/lib/tenant.ts` supplies reusable assertion and query-scope helpers.
- **Prisma 7 driver adapter.** `@prisma/adapter-pg` makes the PostgreSQL runtime
  explicit and supports managed PostgreSQL deployment.
- **Module placeholders are honest.** Navigation reflects the intended MVP, while
  later modules display a clear Milestone 1 empty state and do not simulate data.
- **One active membership for the first shell.** The data model supports multiple
  organisations per user. Organisation switching is deferred and documented as a
  limitation.

## Domain evolution

Add each later domain under its own service/data-access module. Domain tables must
carry `organisationId`; add `locationId` for service-specific records. Use
specialised relational tables for structured reporting. File storage must be behind
an interface and must never expose permanent public object URLs.

## Dashboard-first module decision

The dashboard is being completed before the later domain modules at the user's
request. It renders real tenant-scoped foundation activity and permissions. Counts,
readiness language, completion percentages, deadlines, risks, audits and trends
remain explicit no-data states until their source modules exist. This prevents the
dashboard from inventing governance evidence or implying an official CQC rating.
