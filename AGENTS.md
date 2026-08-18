# Agent Guide

## Purpose

Build QCGMS as a calm, secure, multi-tenant continuous governance, assurance and
action-closure platform for UK adult social care. Follow `PRODUCT_SCOPE.md`,
`PRODUCT_ROADMAP.md` and the current user-approved phase. Do not start a later
phase without the user's request.

QCGMS supports accountable management judgement. It must never claim to provide
compliance, regulator endorsement, an official assessment or a predicted rating.

## Stack and repository

- Next.js 16 App Router, React 19, TypeScript and Tailwind CSS.
- PostgreSQL, Prisma 7 and `@prisma/adapter-pg`.
- Zod, bcryptjs and JOSE.
- Vitest and Playwright.
- `src/app`: routes and route handlers.
- `src/components`: accessible interface components.
- `src/lib`: domain logic, data access, authentication, RBAC and tenancy.
- `prisma`: schema, migrations and fictional demonstration seed.
- Documentation lives at repository root.

Read the relevant local Next.js guide under `node_modules/next/dist/docs/` before
using framework APIs. Use `proxy.ts`, not legacy middleware, and await request
APIs such as `cookies()`.

## Product architecture rules

- Use the canonical entity and ownership rules in `DATA_MODEL.md`.
- Record once and link records; do not create a second source of truth in another module.
- Regulatory content belongs to a versioned framework, never hard-coded CQC logic.
- Material changes may suggest dependencies but may not silently alter care records.
- High-risk actions require evidence and independent verification.
- AI answers must cite authorised sources or escalate uncertainty.
- Do not represent planned controls as active controls.

## Coding conventions

- Keep TypeScript strict; do not use `any` to bypass types.
- Prefer Server Components. Add `"use client"` only for real interaction.
- Validate untrusted input with Zod at the server boundary.
- Keep modules small and domain-oriented.
- Use plain English, visible labels, keyboard focus and helpful states.
- Never invent operational data, findings, readiness scores or KPI values.

## Database conventions

- UUID primary keys, UTC timestamps, explicit foreign keys and indexes.
- Every business record has `organisationId`; add `locationId` where relevant.
- Core searchable fields are relational rather than opaque JSON.
- Use soft deletion unless permanent deletion is specifically authorised.
- Preserve provenance, version and relationship history for governed records.
- Keep migrations descriptive and reversible where practical.
- Seed data must be fictional and labelled as demonstration data.

## Security and tenant isolation

- Never trust organisation or location identifiers supplied by the browser.
- Resolve authority from the server-verified database session.
- Every business query must include the authorised organisation scope.
- Enforce location access with shared tenancy guards.
- UI visibility is not authorisation; enforce permissions server-side.
- Do not place role authority solely in the session token.
- Never log passwords, raw tokens, secrets or unnecessary personal data.
- Do not commit production data, uploads, generated reports or `.env`.
- Activity logging is append-only for ordinary users.
- An unresolved critical tenant-isolation or high-severity clinical-safety defect blocks release.

## Required validation

```bash
npm run db:validate
npm run db:generate
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

For schema work, also test deployment and seed against a disposable PostgreSQL database.

## Definition of done

A feature is complete only when the interface, server logic, schema or migration,
validation, permissions, tenant isolation, states, audit logging, tests and
documentation are present as applicable. All required checks and the production
build must pass.

## Deliberately out of scope

Do not build eMAR, rostering, payroll, invoicing, credit control, staff
scheduling, electronic visit monitoring, family portals, frontline daily care
notes, autonomous clinical or safeguarding decisions, official regulator
integrations or training delivery. Care plans are limited to the governed scope
defined in `PRODUCT_SCOPE.md`.
