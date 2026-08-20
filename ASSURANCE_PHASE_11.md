# Phase 11 validated-launch acceptance record

## Build acceptance criteria

- [x] Internal DBAM and external-provider pilots are distinct tenant-scoped records.
- [x] Every pilot records scope, dates, outcome, success criteria, risks and data-protection basis before completion.
- [x] Pilot status follows a controlled chronology and cannot jump directly from planned to complete.
- [x] Baseline and follow-up measures use governed definitions, direction, sample size, method and evidence reference.
- [x] A different authorised manager must verify a measured outcome before it contributes to launch evidence.
- [x] A pilot cannot complete without at least one independently verified outcome measure.
- [x] Commercial readiness covers support, security, privacy, continuity, onboarding, exit and service levels with meaningful notes linked to the current independently verified evidence version.
- [x] Commercial intent is limited to external-provider pilots and discovery or pilot-only interest does not count as paying intent.
- [x] The launch gate separately requires completed DBAM and external pilots, verified benefit, service readiness, security evidence and external paying intent.
- [x] Missing evidence remains incomplete and the interface does not claim validation, compliance, regulator endorsement or revenue.

## Security and privacy gate

- [x] Every read and mutation derives organisation and user authority from the verified server session.
- [x] Launch and commercial records require `organisation:manage` server-side.
- [x] All mutable records include organisation scope and material changes create activity history.
- [x] Benchmark consent defaults to aggregate measures only, excludes direct identifiers and free text and requires at least ten organisations.
- [x] Benchmark permission requires a DPIA reference, independent review and a visible withdrawal route.
- [x] Phase 11 produces no cross-tenant benchmark output or provider league table.

## Release gate

- [ ] Prisma schema and migration validate against a disposable PostgreSQL database.
- [x] Type checking, lint, 283 unit tests and production build pass.
- [ ] Production database migration applied successfully.
- [ ] Post-deployment pilot, independent verification, service-readiness, commercial-intent and consent-withdrawal smoke checks pass.
- [ ] At least one real external provider supplies retained pilot evidence and stated paying intent before QCGMS is described as externally validated.

## Operational boundary

The Launch Assurance Centre records product-validation evidence; it does not
manufacture customer outcomes, replace contracts, operate a support desk,
certify security, prove regulatory compliance or predict inspection results.
Benchmarking remains disabled as an output capability until cohort volume,
definitions, DPIA, disclosure controls and customer permission are independently
assured.
