# Deployment

## Target

Deploy the Next.js application to Vercel or an equivalent Node.js host and use a
managed PostgreSQL service. Milestone 2 will add S3-compatible private object
storage.

## Environment variables

Set every value in `.env.example`. Production requires a unique random
`SESSION_SECRET` of at least 32 characters and a TLS-protected PostgreSQL
`DATABASE_URL`. Do not expose server variables with a `NEXT_PUBLIC_` prefix.

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
backup alerts, and a rollback decision are assigned to named owners.
