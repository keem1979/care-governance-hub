# Changelog

## 2026-08-04 — ATOM digital service catalogue

- Added a public, responsive ATOM service catalogue at `/catalogue`.
- Added the three approved MVP packages, full comparison table, operating model, daily governance workflow, onboarding, FAQ and legal positioning.
- Added original catalogue photography, a coded platform demonstration, accessible interactions and A4 print/PDF styling.
- Added catalogue maintenance and asset-plan documentation.
- Linked the catalogue from the QCGMS sign-in page.
- Added the ATOM introduction film with accessible playback controls, responsive presentation, poster artwork and a download fallback.

All notable changes are documented here.

## 2026-08-01 — Workforce Suite

- Added private staff profile pictures and staff-linked evidence uploads.
- Added leave and absence requests, manager decisions and annual leave balance calculations.
- Added a searchable training and competency catalogue based on the 2025 Care Certificate and CQC Regulation 18, with role-specific assignments and a live matrix.
- Added automatic Evidence Library synchronisation for the workforce training matrix.

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
