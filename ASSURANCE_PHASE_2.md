# Phase 2 canonical data and synchronisation acceptance record

## Build acceptance criteria

- [x] Canonical external identifiers are unique per organisation, source and entity type.
- [x] Potential client and staff duplicates produce controlled reconciliation cases.
- [x] Identity matching is restricted to the authorised tenant and location scope.
- [x] Ambiguous matches cannot trigger an automatic merge, delete or overwrite.
- [x] Care-plan differences are classified by category and safety severity.
- [x] Material changes create explicit downstream dependency-review items.
- [x] Dependency decisions record rationale and audit history without editing source modules.
- [x] Management work queue separates identity cases from linked-record reviews.
- [x] Automated tests cover cross-tenant separation and safety-relevant classification.

## Release gate

- [x] Ambiguous identity decisions require a named user and review rationale.
- [x] Merge escalation preserves both candidate records and records the proposed canonical record.
- [x] The live care plan remains unchanged until Registered Manager publication.
- [x] Publishing a care-plan version does not silently update risks, actions, evidence, assessments or workforce records.
- [x] Open dependency items remain visible until a human records an applied, dismissed or not-applicable decision.
- [x] Production database migration applied successfully.
- [ ] Post-deployment smoke check.

## Safety boundary

The matching rules deliberately use strong corroborating signals and create review
work only. They do not decide that two records belong to the same person. The
material-change classifier identifies records that may be affected, but it does
not make clinical decisions or copy data into another governed module.

This acceptance record confirms implementation controls. It is not an external
clinical-safety certification or assurance opinion.
