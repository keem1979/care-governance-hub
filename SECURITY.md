# QCGMS security position

This document distinguishes implemented controls from operational assurance that
still requires evidence. QCGMS must not be described as certified, penetration
tested or suitable for live care data until the release gates below are signed.

## Implemented application controls

- Passwords use bcrypt; login inputs are normalised and validated.
- Every account must enrol standards-based TOTP multi-factor authentication.
  Until enrolment is complete, the account can access only its security setup
  and sign-out routes.
- MFA secrets are encrypted with AES-256-GCM. Recovery codes are one-time,
  keyed hashes and are displayed only when generated.
- Successful sign-ins create database-backed, revocable, eight-hour sessions in
  an HTTP-only, `SameSite=Lax`, secure production cookie. Enabling MFA revokes
  other sessions; a user can revoke other active sessions at any time.
- Login abuse limits are stored in PostgreSQL and keyed with a non-reversible
  HMAC of the email/address fingerprint, so limits survive worker restarts and
  do not store the raw identifier.
- Cross-site state-changing requests are rejected. Application responses set
  CSP, frame, MIME, referrer, permissions and opener protections; authenticated
  pages are private, non-indexable and not cached.
- The server data-access layer revalidates the database session, active user,
  active membership, permission set, organisation and location scope. The proxy
  is an early check, not the authority.
- Security-relevant sign-in, failed-sign-in, MFA and session-revocation events
  are appended to the activity log.
- Evidence and policy files use private application-controlled storage routes.

## Required production configuration

- Set unique `SESSION_SECRET` and `MFA_ENCRYPTION_KEY` values of at least 32
  random characters. Keep both only in the managed secret store. A missing MFA
  key falls back to a domain-separated key derived from the session secret for
  compatibility, but this is not the preferred production configuration.
- Use TLS, least-privilege PostgreSQL credentials, encrypted storage, supported
  runtimes, dependency scanning, error monitoring and alerting.
- Trust forwarded client-address headers only from the approved hosting proxy.
- Run migrations from a controlled release job and never seed a live tenant.
- Keep daily encrypted backups with point-in-time recovery where available and
  complete evidenced restore exercises under the recovery plan.

## Release-blocking assurance

Before processing live personal or special-category data, the accountable owner
must retain evidence of:

1. independent penetration testing and closure of critical/high findings;
2. dependency, secret and static-analysis scans in CI;
3. a signed DPIA, controller/processor terms and approved subprocessor list;
4. tested incident response, access recovery, backup restoration and supplier
   outage procedures;
5. a named Clinical Safety Officer and accepted clinical-safety case where the
   deployed use brings DCB0129 into scope;
6. customer configuration, access review, retention schedule and staff training.

Report vulnerabilities privately to the repository owner. Never place live
personal data, credentials, tokens or evidence files in tickets. QCGMS controls
support assurance but do not themselves make a provider GDPR, DSPT, CQC or cyber
certified.
