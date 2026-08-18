# Quality, Compliance and Governance Management System - QCGMS

QCGMS is a secure, multi-tenant continuous governance, assurance and
action-closure platform for UK adult social care. It helps authorised leaders
identify what is unsafe, overdue or unverified and retain evidence that
improvement was completed and sustained.

The product complements digital care records, eMAR, rostering, HR and finance
systems. It does not predict regulator ratings or guarantee regulatory outcomes.

## Product documentation

- [Product charter](PRODUCT_SCOPE.md)
- [Product roadmap](PRODUCT_ROADMAP.md)
- [Canonical data model](DATA_MODEL.md)
- [Module assurance map](MODULE_ASSURANCE_MAP.md)
- [UK regulatory architecture](REGULATORY_FRAMEWORKS.md)
- [Product success measures](PRODUCT_METRICS.md)
- [Technical architecture](ARCHITECTURE.md)
- [Security](SECURITY.md)
- [Testing](TESTING.md)
- [Deployment](DEPLOYMENT.md)

## Technology

- Next.js 16, React 19, TypeScript and Tailwind CSS
- PostgreSQL with Prisma 7
- Zod, bcrypt password hashing and JOSE-signed sessions
- Vitest and Playwright

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

Seeded records are fictional demonstration data and must not be used as
operational evidence.

## Quality checks

```bash
npm run check
npm run test:e2e
npm run build
```

Complete only the current user-approved product phase.
