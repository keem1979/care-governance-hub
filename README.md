# Care Governance Hub

Care Governance Hub is a secure, multi-tenant governance and compliance workspace
for UK adult social care providers. It helps teams organise evidence and understand
what is ready, missing, or urgent without claiming to predict an official CQC rating.

This repository contains the Milestone 1 foundation plus the first completed
post-foundation item: a tenant-scoped governance dashboard. Domain modules that
have not yet been built are represented with explicit no-data states.

## Technology

- Next.js 16, React 19, TypeScript, and Tailwind CSS
- PostgreSQL with Prisma 7 and the PostgreSQL driver adapter
- Zod validation, bcrypt password hashing, and JOSE-signed session cookies
- Vitest for unit tests and Playwright for browser tests

## Local setup

1. Install Node.js 24+ and PostgreSQL 16+.
2. Copy `.env.example` to `.env` and replace every placeholder.
3. Create the configured PostgreSQL database.
4. Run:

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Seeded records are fictional demonstration data.
All demo accounts use `DemoCare!2026`; for example,
`owner@meadowview.demo`. Change or remove demo credentials outside local demo
environments.

## Quality checks

```bash
npm run check
npm run test:e2e
npm run build
```

See [TESTING.md](TESTING.md) for prerequisites and [DEPLOYMENT.md](DEPLOYMENT.md)
for production requirements.

## Product boundary

The MVP is a governance hub, not a care-planning, eMAR, rostering, payroll, or
clinical system. Read [PRODUCT_SCOPE.md](PRODUCT_SCOPE.md) before implementation.
Complete one milestone at a time.
