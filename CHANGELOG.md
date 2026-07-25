# Changelog

All notable changes are documented here.

## 0.1.0 — Milestone 1 Foundation

### Added

- Next.js application shell and complete responsive MVP navigation.
- PostgreSQL/Prisma organisation, location, membership, role, permission, session,
  and activity-log schema with initial migration.
- Password login, signed revocable sessions, session expiry, route protection, and
  login rate limiting.
- Central permission and tenant/location guards.
- Fictional Meadow View Home Care Ltd seed with Basingstoke Branch and seven role
  accounts.
- Accessible login, honest dashboard foundation, and later-module empty states.
- Unit and Playwright foundation tests.
- Core product, architecture, security, data model, deployment, testing, and agent
  documentation.

### Known limitations

- Operational governance modules begin in Milestone 2 and later.
- Multi-organisation and location switching UI is not yet implemented.
- Login rate-limit storage is single-process.
- Database-backed integration and authenticated browser tests require disposable
  PostgreSQL infrastructure.
