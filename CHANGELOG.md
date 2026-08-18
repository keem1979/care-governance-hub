# Changelog

## 2026-08-18 — Phase 1 trust foundation

- Added mandatory TOTP MFA for every account, encrypted MFA secrets, one-time
  recovery codes and self-service revocation of other sessions.
- Replaced worker-memory login throttling with database-backed HMAC-keyed limits.
- Added application-wide browser security headers, private caching and cross-site
  mutation protection.
- Added security-event audit entries and MFA-aware session claims.
- Added controlled DPIA, retention/deletion, incident response, recovery,
  data-processing and clinical-safety documents with explicit live-release gates.
- Added a Phase 1 assurance record distinguishing built controls from independent
  penetration testing, customer acceptance and operational evidence.

## 2026-08-18 — Phase 0 product alignment

- Repositioned QCGMS around continuous assurance and evidence-backed action closure.
- Defined the canonical record model, source-of-truth rules and module assurance map.
- Added a UK-wide versioned regulatory-framework architecture covering all four nations.
- Reconciled the governed care-plan scope with exclusions for eMAR, rostering and daily recording.
- Added measurable customer, adoption, safety and trust outcomes.
- Recorded the approved phased release roadmap and release-blocking gates.
- Updated public messaging to address management risk, verification and sustained improvement.
- Added a matching Phase 0 social sharing card for the continuous-assurance proposition.
- Updated future-build instructions so later work cannot reintroduce contradictory early-MVP scope.

## 2026-08-04 — ATOM digital service catalogue

- Added a public, responsive ATOM service catalogue at `/catalogue`.
- Added the three approved MVP packages, full comparison table, operating model, daily governance workflow, onboarding, FAQ and legal positioning.
- Added original catalogue photography, a coded platform demonstration, accessible interactions and A4 print/PDF styling.
- Added catalogue maintenance and asset-plan documentation.
- Linked the catalogue from the QCGMS sign-in page.
- Added the ATOM introduction film with accessible playback controls, responsive presentation, poster artwork and a download fallback.
- Removed setup and mobilisation fees from every catalogue package and the comparison table.

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
