# Phase 9 trustworthy-Abi acceptance record

## Build acceptance criteria

- [x] Every issued answer has a response class, confidence and at least one visible authorised source.
- [x] Known answers are limited to controlled module capabilities or named official regulator guidance.
- [x] Unsupported capabilities are classified uncertain and create a routine management escalation instead of a guessed answer.
- [x] Clinical or medication decisions, legal assurance, rating prediction, security bypass and record tampering are prohibited.
- [x] Potential emergencies direct the user to immediate procedures and 999 where appropriate; the user is told not to wait for Abi or management.
- [x] Every interaction is tenant-scoped and audited before the answer is returned to the browser.
- [x] The stored question is hashed and redacted; raw questions, email addresses, phone numbers, governed references and long identifiers are not persisted.
- [x] Feedback is linked to the exact audited answer and offers helpful, not-helpful and unsafe outcomes; an unsafe flag creates a high-priority escalation.
- [x] Uncertain and prohibited interactions create a controlled escalation with priority, assigned manager where available and management resolution.
- [x] The Abi Assurance workspace shows answer classes, feedback, source authority and unresolved escalations without a wide table.

## Question-suite gate

- [x] Known module, navigation and official-CQC suites return cited high-confidence answers.
- [x] Uncertain topic and unsupported-capability suites refuse to invent and require escalation.
- [x] Prohibited clinical, emergency, legal/rating and security-integrity suites refuse the request and use the correct escalation priority.
- [x] Access-denied answers do not disclose or link unauthorised modules.
- [x] Existing Abi module, CQC, workflow and non-navigation regression tests remain in force.

## Release gate

- [x] Server-side session, tenant and location controls protect all new reads and mutations.
- [x] Only governance managers can acknowledge, resolve or dismiss escalations.
- [x] Escalation and feedback decisions create activity history.
- [x] Schema validation, type checking, lint, 269 unit tests and production build pass.
- [ ] Production database migration applied successfully.
- [ ] Post-deployment known, uncertain, prohibited, feedback and escalation smoke checks.

## Safety boundary

Abi is a constrained governance guide. It does not diagnose, prescribe, decide
care, give legal advice, certify compliance, predict a regulator rating,
replace emergency or safeguarding procedures, or make autonomous changes. Its
citation and confidence controls help a user assess the basis of an answer; they
do not make the answer professional or regulator advice. Independent clinical
safety review and representative customer evaluation remain required before
broad launch.
