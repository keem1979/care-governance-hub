# Deployment

## Target

Deploy the application through the configured Sites managed runtime and use the
approved PostgreSQL service and private object-storage configuration. Record the
actual legal suppliers, data regions and recovery terms in the production supplier
register; repository documentation is not evidence of a supplier contract.

## Environment variables

Set every value in `.env.example`. Production requires separate random
`SESSION_SECRET` and `MFA_ENCRYPTION_KEY` values of at least 32 characters and a
TLS-protected PostgreSQL `DATABASE_URL`. Do not expose server secrets with a
`NEXT_PUBLIC_` prefix.

## Release process

```bash
npm ci
npm run db:generate
npm run check
npm run test:e2e
npm run build
npm run db:deploy
```

Run migrations once from a controlled release job before promoting the application.
Seed only approved demonstration environments; never run demo seed data against a
live tenant database.

## Backups and restore

Enable daily encrypted backups and point-in-time recovery with the managed database
provider. Document retention and region choices with the data controller. Test a
restore into an isolated environment at least quarterly:

1. Create an empty isolated database.
2. Restore the selected snapshot.
3. Run `npm run db:deploy`.
4. Verify row counts, tenant boundaries, and a read-only login.
5. Destroy the isolated copy under the approved retention process.

Deployment is not complete until health checks, error monitoring, TLS, database
and file backup alerts, MFA enrolment, migration verification and a rollback
decision are assigned to named owners. Live-data launch additionally requires the
open evidence in `ASSURANCE_PHASE_1.md`.
