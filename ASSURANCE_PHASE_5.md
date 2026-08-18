# Phase 5 care and workforce assurance acceptance record

## Build acceptance criteria

- [x] Staff quick view resolves only the published version referenced by `CarePlan.currentVersionId`.
- [x] Draft, approval-stage and superseded instructions are excluded from staff access.
- [x] Each worker login can be linked to one tenant-scoped `StaffMember` profile.
- [x] Assigned staff access is checked against the current care-plan version.
- [x] Acknowledgement requirements are versioned, staff-specific, due dated and auditable.
- [x] Critical or safety-related changes require a worker response and a separate authorised manager decision.
- [x] Care-linked competency requirements use the workforce catalogue and verified compliance records.
- [x] Missing, expired and unverified competency evidence remains a visible gap; competence is never inferred.
- [x] Managers receive one responsive card-based Care Assurance workspace rather than a wide table.

## Release gate

- [x] New care plans have no current version until an authorised Registered Manager publishes one.
- [x] Publishing atomically supersedes the old version and creates the required staff assurance work.
- [x] Existing published plans receive continuity records during migration.
- [x] Workers cannot select or impersonate another staff profile when acknowledging instructions.
- [x] A worker cannot approve their own critical understanding response.
- [x] Tenant and location checks protect all new reads and mutations.
- [ ] Production database migration applied successfully.
- [ ] Post-deployment manager and staff-role safety smoke checks.

## Safety boundary

Care Assurance supports deployment decisions; it does not decide that a worker
is competent, that staffing is safe, or that a care instruction is clinically
correct. A current verified record is a matching signal only. The authorised
manager remains responsible for reviewing the person, instruction, evidence,
staff capability and deployment context.

This is an implementation acceptance record, not external certification.
