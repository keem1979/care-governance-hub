# QCGMS Risk Framework Release-Gate Report

**Decision: PASS — 21 August 2026**

The Organisation Risk Framework, proportional Closure Authority and authenticated Critical Risk lifecycle have passed the required isolated database, server-authorisation, browser, mobile, accessibility, unit and production-build checks. No production database, production account or production authentication setting was used.

## 1. Release scope assessed

This gate covers:

- editable Draft Risk Framework versions;
- versioned, tenant-owned Risk appetite and tolerance;
- historical and legacy Risk behaviour after a framework change;
- proportional closure policy and strongest-recorded-risk authority;
- sufficient appropriate evidence, verification and effectiveness;
- unresolved central Action blocking;
- actual-person proposal, approval, rejection and withdrawal history;
- Critical Risk dual approval by distinct authenticated people;
- tenant, location and role enforcement at the API boundary;
- Closure Assurance Review accessibility and mobile operability.

Evidence Taxonomy and Provider Control Library expansion were deliberately not included in this slice.

## 2. Draft editing

Draft Framework versions are editable through the existing settings architecture. The server permits updates only while the Framework is `DRAFT`, revalidates all closure-role references, replaces its controlled rules within a serializable transaction and appends an Activity Log entry. Approved, Effective, Superseded and Retired versions return a conflict response rather than being rewritten.

This preserves a practical authoring workflow without allowing historical policy mutation.

## 3. Isolated PostgreSQL migration result

PASS.

- A completely separate PostgreSQL 17 cluster was created on local port `55432`.
- Fresh database `qcgms_gate_fresh`: all 57 migrations applied successfully.
- Upgrade database `qcgms_gate_upgrade`: the preceding 56 migrations were applied, fictional pre-framework Risk/Review/Action/Evidence/ActivityLog data was inserted, and migration `20260821060000_risk_framework_authority` was then applied successfully.
- Post-upgrade verification returned `LEGACY_PRESERVATION_PASS`.
- The legacy Risk retained score `8`, appetite `LOW`, tolerance `9`, Review, linked Action, linked Evidence, permissions and ActivityLog history.
- No Framework identifiers or invented provenance were backfilled into the legacy Risk.

The migration is additive. Recovery should be a forward fix; no unsafe down migration has been invented.

## 4. Fictional authenticated people and scope

The E2E environment uses distinct fictional accounts and current memberships:

- Avery Auditor — Risk owner / quality role;
- Blair Bennett — Registered Manager;
- Casey Clarke — Nominated Individual / provider authority;
- Olivia Owner — organisation owner;
- Drew Davies — view-only role;
- Ellis Evans — same tenant, different-location scope;
- Finley Foster — different fictional tenant.

Each authenticated decision is derived from the current signed-in user and membership. No request may nominate another person's approver ID.

## 5. Critical Risk lifecycle

PASS — Chromium, 1 test, approximately 1.8 minutes.

The browser test completed the following real workflow:

1. Avery signed in with MFA and created a Risk from a linked governed source.
2. The Risk was assessed as Critical (`5 × 5 = 25`) with cause, event, consequence, controls, Evidence, treatment and target position.
3. Avery deliberately created a central Action from the Risk.
4. The Action was completed with Evidence; the Risk residual score did not change automatically.
5. Effectiveness was recorded and a formal Risk Review reassessed the residual position.
6. Closure was proposed through the Closure Assurance Review dialog.
7. Self-approval and a forged approver identifier were refused.
8. Blair signed in separately and recorded approval 1 of 2.
9. Casey signed in separately and recorded approval 2 of 2.
10. QCGMS closed the Risk only after the current policy and assurance requirements were satisfied.
11. The Risk, proposal, actual-human approvals and Activity Log retained the decision trail.

The implementation therefore preserves:

`Action completion ≠ effectiveness ≠ Risk reassessment`.

## 6. Direct API bypass tests

PASS.

The server-side closure endpoint—not only the interface—blocked or handled:

- missing supporting Evidence;
- unverified Evidence where required;
- missing effectiveness evidence;
- an unresolved linked treatment Action;
- a residual Risk outside the applied tolerance;
- insufficient approval count;
- view-only role access;
- same-tenant access outside the user's authorised location;
- cross-tenant access;
- self-approval where prohibited;
- a fake approver ID supplied by the browser;
- approval against a policy that became superseded after proposal.

Scoped records use the authorised organisation and permitted-location context. Inaccessible Risk IDs return not found rather than revealing whether another tenant or location owns the record.

## 7. Framework-change and legacy Risk behaviour

PASS.

The test environment activates Framework v1 with tolerance `9`, assesses a Risk, then activates Framework v2 with tolerance `4`.

- The historical Risk score remains unchanged.
- QCGMS displays the current-framework exception without silently rewriting history.
- The Risk adopts v2 only through a deliberate formal Review.
- A pre-framework legacy Risk retains tolerance `9` and null Framework provenance until an authorised Review deliberately applies a current Framework.
- Changing the policy after a closure proposal invalidates approval of the stale proposal with a `409` response; the user must withdraw and re-propose under the current policy.

## 8. Closure proportionality and authority

The closure rule is now **sufficient appropriate closure evidence plus proportionate independent verification**, not literal independent-origin Evidence for every Risk.

The effective provider policy controls requirements by Risk level and optional category. The authority calculation uses the strongest Risk level recorded in the Risk lifecycle, preventing a formerly Critical Risk from falling into a Low closure route solely because treatment reduced its latest residual score.

High/Critical configurations can require verified Evidence, effectiveness and separate approval. Critical supports two distinct actual-person approvals and no self-approval. Lower levels remain configurable for proportionate provider governance.

Closing a Risk does not close its linked Incident, Safeguarding, Complaint, Audit finding, Action or Improvement Plan.

## 9. Closure Assurance Review and retained decisions

PASS.

The previous browser prompt has been replaced with an accessible modal review containing:

- Risk identity, category and residual position;
- applied tolerance and Framework;
- completed and unresolved Actions;
- supporting and verified Evidence;
- effectiveness evidence;
- current signed-in role;
- recorded and remaining approvals;
- satisfied/outstanding Management Assurance reasons;
- a multiline professional rationale.

The dialog provides an accessible name, `role="dialog"`, `aria-modal`, keyboard Escape dismissal, managed initial focus and 44-pixel minimum decision targets.

Rejected and withdrawn proposals remain visible in Closure Decision History with the actual actor, date, role/authority snapshot and rationale. A rejected/withdrawn decision is not overwritten by a later proposal.

## 10. Mobile release check

PASS — iPhone 13 emulation, approximately 44 seconds.

Verified:

- Risk Register and Risk detail have no document-level horizontal overflow;
- long Risk/Evidence content wraps;
- the Closure Assurance Review operates as a usable mobile sheet;
- principal dialog controls meet the 44-pixel touch-target test;
- Framework settings and version history remain usable;
- formal Review and treatment-Action navigation remain reachable;
- the mobile navigation footer no longer competes with the scrollable menu area.

## 11. Automated validation

PASS.

- `prisma validate`: passed.
- TypeScript `tsc --noEmit`: passed.
- ESLint: passed.
- Vitest: 66 files passed; 317 tests passed.
- Production `vinext build`: passed.
- Authenticated browser lifecycle: passed.
- Direct API security/framework/legacy scenario: passed.
- Mobile scenario: passed.

The production build reports existing informational Vite/vinext warnings about future native config loading, runtime resolution of the policy-logo route and route static classification. They did not fail the build and are not caused by the closure governance rules.

## 12. Technical debt and residual concerns

Two test-infrastructure issues are non-blocking but should be scheduled:

1. Running `db:seed` through the current Node/tsx route in the isolated environment can fail because the generated Cloudflare Prisma WASM client is unexpectedly undefined. Real Next server routes successfully exercised Prisma against the same migrated PostgreSQL databases, so this is a seed-runtime compatibility issue rather than a migration failure.
2. On Windows, an interrupted Playwright/Next development run can leave a Next worker alive and block a new port. The final lifecycle run exited cleanly when reusing the owned server, but test-process cleanup should be hardened further for repeatable local runs.

The first Risk-form interaction test was also made hydration-safe after Playwright could select an option before the React prefill handler was attached. The corrected full lifecycle passed.

## 13. Release decision and next phase

**PASS.** The required Risk Framework and Closure Authority release gate is satisfied in the isolated environment. The code has not been committed, pushed or published as part of this validation turn.

Recommended next phase:

1. Commit this release-gate slice when authorised.
2. Deploy through the normal controlled hosting process and run a production-like smoke test against a non-production tenant.
3. Design, but do not prematurely populate, the shared Evidence Taxonomy using `Core family → contextual type → provider extension`, with backwards-compatible mapping for current strings.
4. Produce the Provider Control Library architecture proposal, including controlled versions and applied snapshots.
5. Design the controlled hybrid Governance Relationship layer before any broad cross-module implementation.
