# Phase 6 evidence and regulatory assurance acceptance record

## Build acceptance criteria

- [x] Every evidence record can identify its source type, source organisation or system, reference, author, capture date, official URL and chain-of-custody note.
- [x] Verification is an immutable, named decision tied to the current file version or current live record.
- [x] Replacing a file or changing a live source makes the earlier verification stale.
- [x] A compliance claim receives full support only when its evidence is both explicitly suitable and currently verified.
- [x] Policies and templates have governed requirement mappings with a named rationale; mapping does not prove implementation.
- [x] Official framework changes create owned impact-review work rather than silently changing requirements or documents.
- [x] Mock inspections sample documentary evidence alongside observed practice, people’s experience and staff feedback.
- [x] Existing uploads and historical mappings remain unverified and pending until a named reviewer assesses them.

## Release gate

- [x] Tenant and location checks protect every new read and mutation.
- [x] Verification, mapping, framework-review and mock-inspection decisions create audit history.
- [x] Inspection sign-off is blocked when no current verified and suitable evidence mapping supports the claim.
- [x] Automatic tag matches are suggestions only and do not contribute to the assurance score.
- [x] Schema validation, type checking, lint and automated tests pass.
- [ ] Production database migration applied successfully.
- [ ] Post-deployment evidence, mapping and mock-inspection smoke checks.

## Safety boundary

Evidence Assurance supports structured management judgement. It does not certify
compliance, predict a regulator’s judgement, authenticate an external source by
itself, or prove that care was delivered well. The authorised reviewer remains
responsible for assessing relevance, currency, authenticity, limitations and
the difference between documentary process and practice.

This is an implementation acceptance record, not external certification.
