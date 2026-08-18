# Phase 4 management intelligence acceptance record

## Build acceptance criteria

- [x] Owner, registered-manager, location and personal-work views are role constrained.
- [x] Priority cards and the decision queue are projections of canonical actions, risks and external dependencies.
- [x] Every queue item links to its live source record and assurance chronology.
- [x] Critical, overdue, awaiting-assurance and external-dependency filters have explicit record-based rules.
- [x] Location summaries use only records within the signed-in user's authorised scope.
- [x] Users can save recurring command filters and choose one personal default.
- [x] Delegation records the manager, recipient, scope, responsibilities, reason and effective dates.
- [x] Delegation does not grant permissions or broaden location access.
- [x] Delegation creation, ending, saved-view creation and saved-view removal are audit logged.

## Release gate

- [x] A manager can reach a priority source record from Management Command in two interactions.
- [x] No score or claim is generated without a transparent underlying record rule.
- [x] Assigned-work users see only their owned work and authorised locations.
- [x] Tenant and location checks protect all new reads and mutations.
- [x] Responsive cards avoid forcing users to navigate a wide management table.
- [ ] Production database migration applied successfully.
- [ ] Post-deployment role and location smoke checks.

## Safety boundary

Management Command prioritises existing records; it does not decide clinical
safety, compliance, regulatory ratings or whether a manager should accept a
risk. Authorised people remain responsible for reviewing the source record and
recording the decision.

This is an implementation acceptance record, not external certification.
