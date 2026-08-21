# QCGMS Risk-to-Action Implementation & Assurance Report

Date: 21 August 2026
Scope: authenticated E2E reliability, Risk → canonical Action handoff, completion/effectiveness separation, proportionate Risk closure and preliminary relationship architecture.

## 1. What changed

The Risk record now offers a deliberate **Create treatment action** handoff into the existing central Action Tracker. QCGMS loads the Risk again on the server under the signed-in tenant/location scope, proposes an editable Action draft, and shows the RM that Action completion will not change the Risk automatically.

The Risk detail now also distinguishes completed treatment from tested effectiveness in the Management Assurance Test. Formal Risk review remains the only workflow in this slice that changes the current residual likelihood, impact and score.

Risk closure now requires sufficient appropriate supporting evidence, no unresolved linked treatment Action, and a residual position within the recorded tolerance. High/Critical closure additionally requires current verified evidence, a signed-in separate approver and no owner self-approval. Closure controls open automatically when `Closed` is selected.

Authenticated Playwright setup now provisions only a dedicated fictional E2E user and governed source inside the existing demo tenant. Normal password and MFA login are still exercised; production authentication is not bypassed or weakened.

## 2. Existing architecture reused

- Canonical `Risk` and `RiskReview` models and their existing scoring/history.
- Canonical `Action`, Action source resolution, occurrences, Action evidence, verification and effectiveness lifecycle.
- Existing `sourceType = RISK`, `sourceRecordId`, `sourceReference` and `sourceUrl` fields for the backlink.
- Existing Evidence Library, Evidence verification history and Risk/Action evidence join records.
- Existing organisation, location and permission scopes.
- Existing activity log and generated live Evidence records.
- Existing duplicate/recurrence matching in the Action API.

No Risk-specific Action table, hidden Action lifecycle or second Evidence source was introduced.

## 3. Schema changes

None.

No Prisma migration was needed. The existing Action source fields, Risk evidence links, Action evidence links, verification/effectiveness records and audit history were sufficient for this slice.

## 4. Risk → Action mapping

| Risk information | Proposed central Action value |
|---|---|
| Risk ID | `sourceRecordId` after the existing Action source resolver validates it |
| Risk reference | Action source reference and backlink |
| First substantive treatment line | Proposed Action title |
| Full further-controls/treatment text | Work required |
| Risk category | Mapped to the closest existing Action category |
| Service/location | Action scope |
| Risk owner | Suggested delivery owner |
| Signed-in/eligible oversight user | Suggested RM/senior oversight |
| Treatment target date | Due date |
| Residual level | Contextual Action priority |
| Target score | Expected outcome, explicitly described as an expected future position |
| Risk control-assurance wording | Success-measure context |

Every field is reviewable before the user creates the Action. No Action is created by merely selecting a treatment.

## 5. Duplication prevention

The handoff submits to the existing `/api/actions` endpoint. That endpoint resolves the Risk as the source, creates the existing canonical Action/occurrence records and runs the existing possible-match workflow. The Action appears on the Risk by querying central Actions whose source is that Risk.

Creating another Action from the same or similar finding still invokes the existing match decision. QCGMS does not create a parallel Risk treatment table.

## 6. Completion vs effectiveness

The Action completion endpoint does not update the Risk score or target. Action completion writes Action status, evidence, verification and structured closure only.

The Risk assurance evaluator now reports a completed Action with no Effectiveness Review as outstanding. The Effectiveness Review is recorded through the existing Action assurance workflow. Even after that review, the Risk score remains unchanged until the signed-in RM records a formal Risk Review.

The authenticated browser test demonstrated:

1. current residual `6`, target `2`;
2. Action completed with evidence and verification;
3. current residual still `6`, target still `2`;
4. effectiveness recorded separately;
5. formal Risk Review changed the residual to `2` by an explicit RM decision;
6. target was never silently copied into the current Risk position.

## 7. Closure rule review

The earlier code/UI term “independent evidence” meant evidence linked from the governed Evidence Library other than the generated live Risk record. It did **not** test that every item came from a different person or external organisation. The terminology could nevertheless be misread as a universal independent-origin requirement.

The enforced rule is now:

- all levels: closure rationale, at least one scoped active supporting Evidence record, no unresolved treatment Action, and residual risk within recorded tolerance;
- Low/Moderate: current signed-in governance editor may approve under the present role/permission model; verification by a separate source is not universally mandatory;
- High/Critical: at least one current verified supporting Evidence record, signed-in named approver, and the Risk owner cannot self-approve;
- selected approval cannot be recorded on behalf of another user;
- generated live Risk evidence alone does not count as closure support.

The implementation uses **sufficient appropriate supporting evidence** with proportionate additional verification. It does not impose literal independent-origin evidence on every Low Risk.

## 8. Closure authority

Current authority is controlled by tenant membership, location scope and `governance:edit`. Under the current role map this normally limits Risk editing to Organisation Owner, Registered Manager and Quality Manager. High/Critical Risks add server-side separation between Risk owner and closing approver.

Not yet implemented: a tenant-configurable matrix by Risk level + category, dual approval for Critical Risks, effective dating/versioning of that matrix, or a provider-specific escalation path. The current schema stores only one closure approver, so true Critical dual approval requires a controlled approval-history entity rather than another nullable user column.

Recommended clean design before migration:

- versioned `RiskClosureAuthorityPolicy` owned by organisation;
- versioned rules keyed by level and optional category;
- allowed role keys, self-approval flag and required approval count;
- append-only `RiskClosureApproval` records attributed to signed-in users;
- Risk closure snapshot references the policy version used;
- a policy evaluator service shared by UI readiness and server enforcement.

## 9. E2E testing

Passed:

- dedicated fictional user provisioned only in the demo tenant;
- password + MFA sign-in;
- seven authenticated foundation browser checks (security headers/cross-site rejection, tenant dashboard, Action Tracker, Quality overview and Inspection Centre);
- full desktop Chromium Risk lifecycle: create, source link, cause-event-consequence, inherent/residual/target scoring, controls, Evidence link, Action handoff, premature closure block, Action completion, unchanged Risk, effectiveness review, formal Risk review, proportionate closure and Activity Log history;
- guarded setup and teardown remove only `E2E-RSK-*` Risks and their canonical source-linked Actions from the fictional demo tenant, preventing repeated browser runs from polluting governance records;
- production authentication was not bypassed.

Automated validation passed:

- Prisma schema validation and client generation;
- TypeScript;
- ESLint;
- 65 Vitest files / 305 tests;
- Vinext production build.

Outstanding/testing constraint:

- the Playwright assertions complete successfully, but the Next development server does not terminate cleanly after the runner finishes in this OneDrive workspace and must be interrupted after the `ok` results; this is test-process teardown, not a failed scenario;
- mobile execution of the new long lifecycle scenario was not run in this slice;
- production hosting smoke test was not run because this slice was not published.

## 10. UX observations

Fixed during E2E:

- selecting `Closed` now opens the required closure controls automatically;
- a saved formal Risk review no longer throws before refreshing;
- control/treatment suggestion buttons and evidence suggestion buttons are no longer nested inside another form control's label;
- evidence suggestions now have meaningful accessible names;
- E2E actions fail within 30 seconds rather than hanging until the whole scenario timeout.

Remaining RM friction:

- the Risk form is still long; progressive disclosure and a compact “review proposed Action” drawer would reduce navigation;
- the Action form prefill is useful, but an RM must still scan four full sections before creating a straightforward treatment Action;
- current source selection is Evidence-backed but not yet a universal typed relationship picker across all registers;
- Action effectiveness is on a separate assurance page, which is governance-safe but adds navigation;
- Action verification wording still says “independent verification” even when a Moderate Action is verified by its owner under the existing proportional Action rules; this should be reconciled in the later authority-policy work.

## 11. Technical concerns before organisational Risk appetite

- appetite and numerical tolerance must be separate fields in the versioned framework;
- assessments/reviews need a reference to the framework version used; changing the current framework must not rewrite history;
- Risk categories are currently strings and require a stable mapping/key strategy before category-specific rules;
- current Risk records carry their own tolerance score, so migration should preserve that value as a historical snapshot while introducing inherited framework provenance;
- provider overrides need rationale, actor, effective date and audit history;
- closure authority should consume the same versioned framework or an explicitly linked authority policy to avoid contradictory configuration.

## 12. Governance relationship recommendation

Recommendation: **controlled hybrid**.

Use dedicated joins where the relationship drives core lifecycle, high-volume queries or strict cascading behaviour—for example Risk → treatment Action, Action → Evidence, Action → Effectiveness Review and person → Care Plan.

Add a controlled typed `GovernanceRelationship` only for supplementary cross-module links that do not justify a dedicated domain table. It should not accept arbitrary unvalidated string IDs. Creation must pass through a relationship service that:

- validates both typed endpoints exist;
- requires the same organisation and authorised location scope;
- applies allowed relationship-type rules;
- records direction, provenance, actor and dates;
- prevents cross-tenant linking;
- retains retirement/history rather than destructive deletion;
- exposes typed query helpers for reporting and permissions.

This gives dedicated joins strong referential integrity for critical lifecycles while avoiding a join-table explosion for secondary traceability. A broad relationship migration was deliberately not implemented in this slice.

## 13. Recommended next step

Proceed to the organisation Risk Framework design and migration plan, but include the closure-authority policy in that design before changing schema. The first deliverable should define:

1. versioned/effective-dated qualitative appetite;
2. category tolerance thresholds;
3. Risk assessment/review framework-version snapshots;
4. override rationale/history;
5. proportionate closure authority rules and approval history;
6. backwards-compatible treatment of existing per-Risk tolerance values.

After that schema proposal is agreed, implement the smallest migration that preserves current Risk history and tenant isolation. Evidence taxonomy remains the following architectural slice.
