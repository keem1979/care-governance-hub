# Phase 1 trust-foundation acceptance record

## Build acceptance criteria

- [x] Mandatory TOTP MFA, encrypted factor secret and one-time recovery codes.
- [x] Database-backed login abuse protection without raw email/address storage.
- [x] Revocable database sessions and user-controlled revocation of other sessions.
- [x] Application-wide browser and cross-site mutation protections.
- [x] Organisation/location boundary helpers and automated negative tests.
- [x] DPIA, retention/deletion, incident, recovery, processing and clinical-safety drafts.

## Live-release gates — evidence still required

- [ ] Independent penetration test; no unresolved critical/high finding.
- [ ] CI dependency, secret and static-analysis evidence.
- [ ] Production supplier register, DPA, regions and transfer review.
- [ ] Customer-approved DPIA, lawful-basis record, notices and retention schedule.
- [ ] Named Clinical Safety Officer; hazard and residual-risk acceptance.
- [ ] Successful isolated backup restore and downtime/reconciliation exercise.
- [ ] Pilot access review, MFA recovery drill and staff training evidence.

## Dependency scan note

The production-only npm advisory scan reported zero known vulnerabilities on
18 August 2026. The full development tree reports two high-severity denial-of-
service advisories in `image-size`, used by the pinned Vinext build tool. The
application does not pass user uploads to that build-time parser. A Vinext major
beta upgrade is the available automated remediation and requires separate hosting
compatibility testing; the accountable release owner must review this bounded
build-tool exposure rather than treating it as a deployed runtime finding.

Application code does not close these operational gates. Evidence must be linked
to the relevant QCGMS evidence, risk and action records before live-data release.
