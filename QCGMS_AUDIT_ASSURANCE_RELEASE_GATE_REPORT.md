# QCGMS Audit Assurance release-gate report

Date: 21 August 2026 (Europe/London)

## 1. Release decision

**PASS — validated local release candidate.** All mandatory release-gate criteria passed on a fresh isolated PostgreSQL database and on an immediately preceding-schema upgrade. This is not a statement that production has been migrated or deployed.

## 2. Pre-Audit baseline

- Branch: `phase-11-validated-launch`
- Published commit at start and finish: `7f44992ba09dc8c316d598f223078d899b51cdf4`
- Pre-Audit working-tree entries: 43, preserved in `PRE_AUDIT_VALIDATED_BASELINE.md`
- Baseline: 59 migrations, 68 Vitest files/337 tests, Action Assurance desktop 3/3 and mobile 1/1 passed
- Production database, migration and deployment were not accessed

## 3. Existing Audit architecture reused

The implementation extends the existing Next.js App Router, Prisma/PostgreSQL, session/RBAC/location scope, `AuditTemplate → AuditSection → AuditQuestion`, `Audit → AuditResponse → AuditFinding`, central `Action`, central `Evidence`, Activity Log and existing Audit/report pages. It does not create a second Audit, Action or Evidence lifecycle.

## 4. Schema/migration

Migration `20260821194500_audit_assurance_closed_loop` is migration 60. It adds:

- role-aware `AuditFindingEvidence` with traceable snapshots and retirement rather than destructive unlinking;
- append-only `AuditReaudit` and `AuditReauditEvidence`;
- stable criterion snapshots, immediate-control/escalation data and a unique canonical `AuditFinding.actionId`;
- attributable finding resolution;
- separate fieldwork-completion and governance-assurance sign-off;
- versioned, effective-dated provider `ActionAssurancePolicyVersion` and scoped `ActionAssuranceRule` for non-Risk Actions.

Fresh migration and 59→60 upgrade proofs passed. Upgrade fixtures proved historical Audit, response, template-version and Action data remained intact. A partial unique index prevents duplicate active Evidence links for the same finding, Evidence and role.

## 5. Audit Template/versioning

Existing versioned templates were preserved. An Audit retains both the canonical template ID and the version string used when opened; question references are restrictive rather than silently rewritten. Only published, non-empty templates can start an Audit. No endpoint was added that mutates an approved version in place. A future refinement should add explicit Draft/Approved/Retired states and effective dates instead of relying mainly on `isPublished` plus version.

## 6. Audit scope and sampling

The quick-start journey requires only template, location and date. QCGMS supplies title, objective, standards and a risk-appropriate sampling default. Optional controls capture review period, scope, method, size, sample details, standards and limitations. This follows “select → confirm → type only when necessary” while preserving a defensible audit trail.

## 7. Audit responses/scoring

Responses remain structured and evidence-led. `NOT_APPLICABLE` is excluded from the weighted denominator and shown separately. Percentage is retained as a fieldwork indicator, not an assurance verdict. An unresolved Critical finding overrides a high score and visibly blocks assurance. `INSUFFICIENT_EVIDENCE` was not added as a new global response value in this slice because changing all provider template vocabularies needs a backwards-compatible design; evidence gaps remain visible through required locators and assurance checks.

## 8. Findings

Non-compliant/partial responses create or update a governed Finding with a stable criterion snapshot. Findings carry severity, summary, recommendation, immediate control, escalation decision, Action requirement and attributable resolution. Critical findings require an immediate safety control and management escalation before assurance. Governed findings are not silently deleted when a response changes.

## 9. Finding Evidence

Evidence is linked from the canonical Evidence Library and classified by role: Sample, Response, Finding, Supporting or Effectiveness. Each link records who linked it, when, its governed snapshot and any later retirement reason/actor/date. Source locators remain on the response. Evidence existence is not treated as proof of effectiveness.

## 10. Finding → central Action

“Review and create corrective Action” opens the existing central Action creation workflow with Audit/Finding source, backlink, location, suggested wording, expected outcome and closure-evidence expectation pre-populated. The RM reviews and deliberately creates the Action. `AuditFinding.actionId` then stores the referentially safe one-to-one handoff and prevents duplicate Actions for the same finding.

## 11. Action Assurance reuse

Audit Actions use the already-built central lifecycle: completion record → role-aware Evidence → verification → effectiveness → authorised closure. Root cause and external dependencies are reused. Audit code does not copy these functions. Closing an Action neither resolves the Finding nor closes the Audit.

## 12. Non-Risk Action Assurance policy

The previous Risk closure framework remains authoritative for Risk-sourced Actions. A minimal provider Action Assurance policy now covers non-Risk sources by source type and priority, with version, effective period, lifecycle state, verification/effectiveness/root-cause/separation requirements, closure roles and audit history. Audit High/Critical Actions can therefore require stronger segregation without hard-coding one provider’s operating model. Safe QCGMS defaults apply where no effective provider rule exists.

## 13. Re-audit/effectiveness

Targeted re-audit is an append-only review against the original stable criterion. It records review date, sample, result, decision, reviewer and governed Evidence. High/Critical findings require a `RESOLVED` targeted re-audit before finding resolution. The original failed response and Finding remain historical; re-audit does not rewrite the Audit.

## 14. Recurrence

Recurrence is deterministic where the same tenant, location and stable template/section/question criterion key has appeared previously. The UI labels the repeated criterion and surfaces a potential assurance conflict. It is a governance prompt, not automatic blame or a professional conclusion.

## 15. Management Assurance Test

The reusable readiness service returns **Ready for assurance** or **Outstanding requirements**, never a reassuring percentage. It checks Critical safety controls/escalation, mandatory fieldwork, fieldwork sign-off, canonical Action closure, High/Critical targeted re-audit, attributable Finding resolution and unresolved Critical findings. Reasons are shown for every failed condition.

## 16. Audit completion vs governance assurance

Fieldwork completion and governance assurance are separate attributable decisions. Completing the form records who completed fieldwork and when. It does not resolve Findings. Governance closure requires readiness, rationale and an authorised user; it records who assured the Audit and when. The E2E scenario proved that Action closure alone could not resolve the Critical Finding.

## 17. Reports

The printable Audit report is generated from structured records and includes branded document control, template/version, scope/sample/limitations, applicable denominator, Critical override, responses, Findings, canonical Actions, Evidence roles, re-audit outcomes and the governance-assurance decision. It does not claim a CQC rating or external endorsement.

## 18. Dashboard/exception behaviour

No duplicate dashboard was created. The Audit detail page prioritises Critical override, outstanding assurance requirements, recurrence, open Findings and linked Actions. Canonical Audit Actions continue to flow into existing Action/My Work/management exception views. A provider-wide recurring-criterion trend view remains a later reporting enhancement.

## 19. Permissions/security

All new Audit and Action mutations reuse server-side capability checks plus organisation and authorised-location scoping. Evidence search and mutation validate tenant ownership. Cross-tenant and out-of-location reads/mutations return not found; a read-only user is denied mutation. Action technical capability and provider governance authority are evaluated separately. The test-only fixture route remains unavailable in ordinary production and requires both a local release-gate flag and secret token in the compiled test server.

## 20. Performance

An isolated probe inserted 5,000 synthetic Evidence records. Contextual taxonomy search completed in 10.277 ms execution time and the active Evidence list query in 11.536 ms on the local PostgreSQL gate. This is acceptable evidence for the tested volume, not a substitute for production-scale telemetry. The search uses a sequential scan at this size; trigram/full-text indexing should be reviewed before materially larger datasets.

## 21. Mobile/accessibility

Signed-in mobile tests passed for Action Assurance and Audit fieldwork. The Audit form had no horizontal viewport overflow and key controls remained usable. Controls use native labelled inputs/selects and visible headings. Formal WCAG testing with keyboard-only and assistive technology remains outstanding.

## 22. E2E scenarios

- **Medication Audit:** created from a controlled template, completed responses, linked governed Evidence and generated one canonical Action.
- **Critical Finding:** percentage could not hide the Critical exception; immediate control, escalation, separate verification, effectiveness, re-audit and assurance were enforced.
- **Recurring Finding:** a later Audit using the same stable criterion produced a deterministic recurrence prompt while preserving the earlier record.
- **Low Finding:** a minor administrative gap was resolved proportionately without forcing High/Critical bureaucracy.

The same signed-in suite also proved failed-verification history, separate authority, ineffective Action reopening, unresolved dependency blocking, Risk residual score remaining unchanged, cross-tenant denial, location denial and read-only denial. Final clean result: desktop 5/5 first attempt; mobile 2/2.

## 23. Automated validation

- Prisma schema validation: PASS
- Prisma client generation: PASS
- Fresh 60-migration chain: PASS
- 59→60 upgrade and historical-preservation fixture: PASS
- Seeded schema proof: PASS
- TypeScript: PASS
- ESLint: PASS
- Vitest: 69 files, 341 tests, all PASS
- Signed-in desktop Playwright: 5/5 PASS
- Signed-in mobile Playwright: 2/2 PASS
- `git diff --check`: PASS
- production Vinext build: PASS

The Vinext build reported non-blocking future Vite native-config warnings and its usual unknown static route classification; no build error occurred.

## 24. Historical integrity

The migration backfills stable criterion keys and fieldwork attribution without deleting historical rows. Restrictive foreign keys protect templates, questions, canonical Actions, governed Evidence and re-audits. Evidence retirement preserves the original link and provenance. Re-audit appends a new decision. Finding resolution preserves resolver, date and rationale. Existing legacy Audit sign-off fields remain for compatibility.

## 25. Repository/deployment state

- Committed: **No**
- Pushed: **No**
- Deployed/published: **No**
- Production database migrated: **No**
- Branch/HEAD unchanged: `phase-11-validated-launch` / `7f44992ba09dc8c316d598f223078d899b51cdf4`

The working tree intentionally contains the pre-existing Action Assurance slice plus this Audit Assurance slice. No production or remote state was altered.

## 26. Technical debt

- Add explicit controlled template lifecycle/effective dates and a clear “create new version” operation.
- Reconcile legacy `signedOffBy/At` with the new explicit fieldwork/governance fields after a compatibility period.
- Add provider-configurable Audit closure authority/independence rules if providers need more than current capability-based Audit sign-off.
- Design backwards-compatible `INSUFFICIENT_EVIDENCE` template vocabulary before global adoption.
- Add full-text/trigram Evidence search only when production-scale measurements justify it.
- Add provider-wide recurrence/trend reporting and formal WCAG/assistive-technology verification.
- Reformat the compact Audit E2E source for maintainability without changing coverage.
- Address future Vite native-config import warnings separately; they are not release blockers.

## 27. What was deliberately NOT built

- No duplicate Action, Evidence, Risk, relationship or dashboard lifecycle.
- No automatic professional risk, safeguarding, CQC or assurance decision.
- No score-to-assurance conversion and no automatic closure coupling.
- No silent Action creation, Finding resolution, Audit closure or signed-record overwrite.
- No broad AI recurrence inference; only deterministic criterion matching.
- No 300-item static Evidence list and no Material Change module.
- No production authentication bypass; local E2E access is doubly gated.

## 28. Recommended next module

**Incidents** is the safest next module. It is high-volume, already has natural links to Risk, Action and Evidence, and can prove the same closed loop—incident → investigation/root cause → canonical Action → verification/effectiveness → learning → authorised closure—before applying the pattern to the more sensitive Safeguarding workflow. Complaints should follow Incidents; Safeguarding should follow once authority/escalation rules are explicitly agreed. Improvement Plans can then become a cross-module orchestration view rather than another competing Action lifecycle.

