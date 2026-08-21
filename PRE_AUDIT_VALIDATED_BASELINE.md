# QCGMS pre-Audit validated baseline

Captured: 21 August 2026 (Europe/London), before Audit Assurance implementation.

## Repository position

- Branch: `phase-11-validated-launch`
- Published commit: `7f44992ba09dc8c316d598f223078d899b51cdf4`
- Repository migrations: 59, through `20260821190000_action_evidence_assurance`
- Pre-Audit working-tree entries: 43
- Commit/push/deployment authorised: No

## Validated release position

- Action Evidence & Assurance release gate: PASS
- Fresh PostgreSQL migration chain: PASS (59 migrations)
- Previous-schema upgrade preservation: PASS (58 + final migration)
- Authenticated desktop Action Assurance E2E: PASS (3/3)
- Authenticated mobile Action Assurance E2E: PASS (1/1)
- Repeat same-port Windows release gate: PASS (two complete runs)
- Prisma validation and generation: PASS
- TypeScript: PASS
- ESLint: PASS
- Unit/integration: PASS (68 files, 337 tests)
- Production Vinext build: PASS
- Production database, migration and deployment: Not accessed

## Pre-Audit working-tree inventory

### Modified

- `.gitignore`
- `package.json`
- `playwright.config.ts`
- `prisma.config.ts`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/app/(app)/actions/[id]/assurance/page.tsx`
- `src/app/(app)/actions/[id]/edit/page.tsx`
- `src/app/(app)/actions/[id]/page.tsx`
- `src/app/(app)/actions/page.tsx`
- `src/app/(app)/actions/report/page.tsx`
- `src/app/(app)/risks/[id]/page.tsx`
- `src/app/api/actions/[id]/assurance/dependencies/[dependencyId]/route.ts`
- `src/app/api/actions/[id]/assurance/dependencies/route.ts`
- `src/app/api/actions/[id]/assurance/effectiveness/route.ts`
- `src/app/api/actions/[id]/assurance/root-cause/route.ts`
- `src/app/api/actions/[id]/assurance/verification/route.ts`
- `src/app/api/actions/[id]/route.ts`
- `src/app/api/actions/[id]/updates/route.ts`
- `src/app/api/actions/export/route.ts`
- `src/app/api/actions/route.ts`
- `src/app/api/test/e2e/setup/route.ts`
- `src/components/action-form.tsx`
- `src/components/assurance-workflow-controls.tsx`
- `src/lib/actions.test.ts`
- `src/lib/actions.ts`
- `src/lib/assurance-improvement.test.ts`
- `src/lib/assurance-improvement.ts`
- `tests/e2e/fixtures.ts`
- `tests/e2e/global-setup.ts`
- `tests/e2e/global-teardown.ts`

### New/untracked

- `prisma/migrations/20260821190000_action_evidence_assurance/`
- `scripts/playwright-web-server.mjs`
- `scripts/release-gate/action-assurance-upgrade-fixture.sql`
- `scripts/release-gate/verify-action-assurance-fresh.sql`
- `scripts/release-gate/verify-action-assurance-upgrade.sql`
- `scripts/run-action-assurance-release-gate.mjs`
- `src/app/api/actions/[id]/assurance/closure/`
- `src/app/api/actions/[id]/evidence-links/`
- `src/lib/action-assurance.test.ts`
- `src/lib/action-assurance.ts`
- `tests/e2e/action-assurance-mobile.spec.ts`
- `tests/e2e/action-assurance-release-gate.spec.ts`

This manifest is documentary only. It does not commit, push, deploy, migrate or alter production state.
