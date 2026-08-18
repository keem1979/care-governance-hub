# Phase 3 assurance and improvement acceptance record

## Build acceptance criteria

- [x] Every Action Tracker record has one canonical `Finding` chronology.
- [x] Existing actions are backfilled without duplicating their source record.
- [x] Structured cause review separates immediate, contributing and system causes.
- [x] High and critical cause reviews require a different authorised manager to approve them.
- [x] Verification records completed work, evidence, the success-measure result and rationale.
- [x] A user can record only their own verification decision.
- [x] High and critical actions cannot be self-verified by the action owner.
- [x] Effectiveness review compares observed results with the predefined success measure.
- [x] Recurrence or ineffective control reopens the action and creates a recurrence case.
- [x] Sustained improvement is recorded only after a verified effective review without recurrence.
- [x] External dependencies retain contact email and phone fields, chasing, ageing, interim control and escalation.
- [x] Improvement plans group related actions without replacing their individual ownership or evidence.

## Release gate

- [x] A complete source-to-sustained-improvement chronology is available from each action.
- [x] Management responses alone cannot close an action.
- [x] Evidence is required for verification and must already be authorised and linked to the action.
- [x] Effectiveness cannot be marked successful while recurrence is present.
- [x] Improvement plans cannot complete until every linked action reaches sustained improvement.
- [x] Tenant and location filters protect every new read and mutation path.
- [x] Production database migration applied successfully.
- [ ] Post-deployment smoke check.

## Safety boundary

QCGMS records professional and management decisions; it does not decide root
cause, clinical safety, verification or effectiveness. System-generated text is
limited to workflow statements that require an authorised person to review the
underlying evidence and controls.

This is an implementation acceptance record, not external certification.
