# Phase 7 governance-control acceptance record

## Build acceptance criteria

- [x] Controlled decisions originate from a decision recorded in approved meeting minutes.
- [x] Each decision retains its accountable owner, source meeting, impact, linked action, evidence and review outcome.
- [x] High and critical decisions cannot be marked implemented without current verified evidence.
- [x] The accountable owner and implementer cannot perform the independent decision review.
- [x] Commissioner and external obligations retain a named party, owner, deadline, interim control and escalation route.
- [x] Submission, query, chase, acceptance and closure events form an append-only chronology.
- [x] An external obligation cannot move directly from submission to closure; an acceptance outcome must be recorded first.
- [x] External action dependencies select a controlled external-party record rather than creating another free-text identity.
- [x] Decision reviews, obligations and external dependency deadlines appear in the unified calendar and deep-link to their canonical records.

## Release gate

- [x] Tenant and location scope protect every new read and mutation.
- [x] Server-side permissions protect all governance-control mutations.
- [x] Decision, obligation and external-party changes create activity history.
- [x] Responsive cards keep core work usable without a wide table.
- [x] Schema validation, type checking, lint, unit tests and production build pass.
- [ ] Authenticated browser suite rerun after the durable test-account login throttle clears.
- [ ] Production database migration applied successfully.
- [ ] Post-deployment decision, obligation, dependency and calendar smoke checks.

## Safety boundary

Governance Control records accountability and assurance decisions. It does not
prove that care was delivered well, replace statutory notification routes,
submit commissioner returns automatically, or certify regulatory compliance.
Named managers remain responsible for checking deadlines, evidence, external
responses and the effect of decisions in practice.
