# Agent Guide

## Purpose

Build Care Governance Hub: a calm, secure, multi-tenant governance and compliance
workspace for UK adult social care. It is an internal evidence-readiness tool and
must never claim to provide compliance, an official CQC assessment, or a predicted
rating. Follow `PRODUCT_SCOPE.md` and complete only the requested milestone.

## Stack and repository

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS.
- PostgreSQL, Prisma 7, `@prisma/adapter-pg`.
- Zod, bcryptjs, JOSE.
- Vitest and Playwright.
- `src/app`: routes and route handlers.
- `src/components`: accessible interface components.
- `src/lib`: server data access, authentication, RBAC, and tenancy.
- `prisma`: schema, migrations, and fictional demo seed.
- `tests/unit` and `tests/e2e`: automated checks.
- Documentation lives at repository root.

Next.js 16 differs from older releases. Read the relevant local guide under
`node_modules/next/dist/docs/` before using framework APIs. Use `proxy.ts`, not
legacy middleware; await request APIs such as `cookies()`.

## Coding conventions

- Keep TypeScript strict; do not use `any` to bypass types.
- Prefer Server Components. Add `"use client"` only for real interaction.
- Validate untrusted input with Zod at the server boundary.
- Keep modules small and domain-oriented; avoid oversized routes and components.
- Use plain English, visible labels, keyboard focus, helpful empty/error states,
  and never rely on colour alone.
- Never invent operational data, findings, readiness scores, or KPI values.

## Database conventions

- UUID primary keys; UTC timestamps; explicit foreign keys and indexes.
- Every business record has `organisationId`; add `locationId` where relevant.
- Core searchable/reportable fields are relational, not an opaque JSON blob.
- Governance records use soft deletion unless permanent deletion is authorised.
- Migration names are chronological and descriptive. Commit schema, generated SQL,
  and seed changes together. Keep migrations reversible where practical.
- Seed data must be fictional and clearly marked as demonstration data.

## Security and tenant isolation

- Never trust an organisation or location ID supplied by the browser.
- Resolve the active membership from the server-verified database session.
- Every repository query must include the authorised `organisationId`.
- Location-scoped records must also use `tenantWhere` or
  `assertLocationAccess`.
- Check permissions in the data access layer or mutation handler; hiding UI is not
  authorisation.
- Do not put role names or tenant authority solely in the session token.
- Never log passwords, raw session tokens, secrets, or unnecessary personal data.
- Do not commit `.env`, production data, uploaded evidence, or generated reports.
- New activity logging must be append-only for ordinary application users.

## Required commands

```bash
npm run db:validate
npm run db:generate
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

For schema work, also test the migration against a disposable PostgreSQL database
with `npm run db:deploy` and run `npm run db:seed`.

## Definition of done

A feature is complete only when interface, server logic, schema/migration,
validation, permissions, tenant isolation, states, audit logging where required,
tests, and documentation are present. Type checking, linting, tests, and production
build must pass. Report changed files, database changes, commands, test results, and
limitations after every milestone.

## Deliberately out of scope

Do not build care planning, eMAR, rostering, payroll, invoicing, staff scheduling,
family portals, daily notes, AI document analysis, CQC integration, native mobile
apps, or training delivery. Do not start the next milestone without the user's
request.
