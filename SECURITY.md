# Security

## Implemented in Milestone 1

- Passwords are hashed with bcrypt (cost 12 in seed data).
- Login input is validated and normalised with Zod.
- Login attempts are rate-limited by email and forwarded client address.
- Sessions are database-backed, revocable, expire by default after eight hours,
  and are represented by an HTTP-only, `SameSite=Lax`, signed cookie.
- Production cookies require HTTPS.
- Proxy provides an optimistic route check; the server data-access layer performs
  the authoritative database check.
- Disabled users, inactive memberships, revoked sessions, and expired sessions are
  rejected.
- Role permissions are centralised. Organisation and location access helpers reject
  cross-tenant identifiers.
- Successful login and logout events are appended to the activity log.
- Environment secrets and data files are excluded from version control.

## Production requirements

- Generate a unique 32+ byte `SESSION_SECRET`; never reuse the example.
- Place the application behind TLS and a trusted reverse proxy. Configure forwarded
  client IP headers only from that proxy.
- Replace the in-memory login limiter with a shared Redis or database-backed limiter
  before horizontal scaling.
- Apply least-privilege PostgreSQL credentials, encrypted storage, daily automated
  backups, point-in-time recovery where available, and quarterly restore tests.
- Retain logs and personal data only under an approved retention schedule.
- Add monitoring for repeated authentication failures and elevated error rates.
- Add MFA or an approved identity provider before handling live sensitive records.
- Run dependency, secret, SAST, and container scans in CI.

## Incident and vulnerability reporting

Do not include live personal data, credentials, tokens, or evidence files in issues.
Report vulnerabilities privately to the repository owner with reproduction steps and
impact. Revoke affected sessions and secrets before discussing an incident publicly.

This software does not itself make an organisation GDPR-compliant or CQC-compliant.
