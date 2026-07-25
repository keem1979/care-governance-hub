# Testing

## Commands

```bash
npm run db:validate
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run test:e2e
npm run build
```

Unit tests cover signed-session expiry and tampering, central role permissions,
login validation and rate limiting, organisation isolation, and location scope.
Playwright covers the public sign-in experience and unauthenticated route
protection in desktop and mobile Chromium profiles.

## Database verification

Set `DATABASE_URL` to a disposable PostgreSQL database, then run:

```bash
npm run db:deploy
npm run db:seed
```

Verify all seven demo roles can sign in, and verify a revoked session, deactivated
user, and cross-tenant identifier are rejected. Never point destructive test or seed
commands at a production database.

Successful database-backed login, failed login logging, multi-organisation
selection, and full permission workflows will gain integration coverage when a
disposable PostgreSQL service is added to CI.
