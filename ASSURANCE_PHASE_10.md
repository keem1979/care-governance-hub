# Phase 10 configurable-delivery acceptance record

## Build acceptance criteria

- [x] Organisation configuration is stored as numbered tenant-scoped versions.
- [x] Every configuration snapshot contains mandatory safety controls and server validation rejects any disabled control.
- [x] Only one draft or submitted version can be open for an organisation at a time.
- [x] Draft withdrawal preserves rejected history and never changes the current live configuration.
- [x] Live promotion requires all onboarding evidence and a different authorised manager from the creator and requester.
- [x] The current live version is superseded rather than deleted when a new version is approved.
- [x] Critical-safety notifications cannot be disabled or delayed.
- [x] Personal action, workforce and product-update visibility follows the signed-in membership’s saved preference.
- [x] Onboarding completion requires a meaningful evidence note; blocked items require a reason.
- [x] Adoption events record workflow metadata only and display “No data recorded” when no valid observation exists.
- [x] Configuration, promotion, onboarding and notification changes create activity history.

## Safety and security gate

- [x] All reads and mutations derive organisation and user authority from the verified server session.
- [x] Configuration and onboarding management requires `organisation:manage` server-side.
- [x] Promotion approval revalidates the configuration snapshot and current readiness evidence.
- [x] Promotion approval enforces creator/requester and reviewer separation.
- [x] The interface does not claim compliance, certification or a predicted regulator rating.
- [x] Analytics exclude confidential narrative, client details, document content and form answers.

## Release gate

- [ ] Prisma schema and migration validate against a disposable PostgreSQL database.
- [x] Type checking, lint, 276 unit tests and production build pass.
- [ ] Production migration applied successfully.
- [ ] Post-deployment sandbox, checklist, preference and separation-of-duties smoke checks pass.

## Operational boundary

The Implementation Centre governs QCGMS configuration and adoption evidence. It
does not configure external mail delivery, certify staff competence, replace an
organisation’s implementation governance or prove regulatory compliance. A
saved cadence records the desired delivery schedule; scheduled email delivery
must not be described as active until an approved mail provider is connected.
