# QCGMS Organisation Risk Framework & Closure Authority Report

## 1. Existing architecture inspected

The implementation reuses the existing Prisma/PostgreSQL tenant model, `OrganisationMembership`/`Role`/`Permission` authority, location-scoped authorised context, central `Risk`, `RiskReview`, `Action`, `Evidence`, Evidence verification/effectiveness records and append-only `ActivityLog`. The controlled lifecycle follows the existing versioned-configuration pattern without forcing Risk policy into the general configuration JSON.

## 2. Final architecture

The architecture deliberately separates:

- an organisation-owned, effective-dated `RiskFrameworkVersion` for appetite, tolerance and category rules;
- a paired, versioned `RiskClosurePolicyVersion` for closure authority;
- Risk and RiskReview snapshots for historical provenance;
- a deliberate closure proposal; and
- append-only actual-human approval decisions.

Both controlled versions follow Draft → In review → Approved → Effective → Superseded/Retired. Content has no update endpoint after creation. An incorrect draft can be withdrawn into retained history and recreated. Activating a version supersedes the previous effective framework and policy atomically.

## 3. Schema

New entities:

- `RiskFrameworkVersion`: tenant, version, lifecycle, effective dates, defaults, rationale and approval actors.
- `RiskFrameworkRule`: exact stable category key, display-label snapshot, appetite, tolerance and escalation indicator.
- `RiskClosurePolicyVersion`: independently identifiable closure policy version paired to the framework.
- `RiskClosureAuthorityRule`: level/category authority, proposer/approver role keys, self-approval, approval count, verified-Evidence and effectiveness requirements.
- `RiskClosureProposal`: final residual/tolerance/appetite, Actions, Evidence, rationale, proposer role and policy/framework-at-time snapshots.
- `RiskClosureProposalEvidence`: governed Evidence relationships used by the proposal.
- `RiskClosureApproval`: append-only decision by the actual signed-in user and current membership, with role/authority/policy snapshots.

Additive Risk/RiskReview fields preserve category key, applied framework/rule, inherited and applied values, override rationale/actor/time, and closure policy/final appetite/tolerance. `CLOSURE_PROPOSED` is a visible Risk lifecycle state. Database constraints enforce valid thresholds, valid approval counts, one active/draft policy state and one pending proposal per Risk.

## 4. Historical migration

The migration adds nullable provenance fields only. It does not update existing Risk appetite, tolerance, category or score values and does not backfill framework IDs. Existing values therefore remain truthful legacy Risk-level snapshots. A legacy Risk receives framework provenance only if an authorised user explicitly selects **Apply current framework** or an authorised override during a formal Risk Review.

## 5. Category strategy

The stable keys are exact mappings of the existing product taxonomy: `CARE_QUALITY`, `CLINICAL`, `SAFEGUARDING`, `MEDICINES`, `WORKFORCE`, `OPERATIONAL`, `BUSINESS_CONTINUITY`, `FINANCIAL`, `INFORMATION_GOVERNANCE`, `CYBER_SECURITY`, `HEALTH_AND_SAFETY`, `COMPLIANCE`, `COMMISSIONER_CONTRACT`, `REPUTATIONAL`, `STRATEGIC`, and `OTHER`.

Mapping is exact and case-sensitive by design. Any historical/custom string not exactly matching an existing display label remains unmapped with null provenance. No fuzzy conversion or guessed backfill occurs.

## 6. Appetite vs tolerance

Appetite is stored as a qualitative governance position: Zero tolerance, Very low, Low, Moderate or Open. Tolerance is a separate integer threshold from 1–25. “Zero tolerance” never creates or implies a numerical zero score.

## 7. Framework inheritance

When a new Risk category is selected, the server resolves the organisation's currently effective framework at the current time, then resolves an exact category rule or the organisation default. The server—not a hidden browser value—sets appetite, tolerance, framework/rule IDs and snapshots. The form displays the applied version/category/appetite/tolerance read-only, removing repeat RM entry. A custom category fails safely to the legacy/manual path.

## 8. Risk Review behaviour

Historical Risks are unchanged when policy changes. The Risk detail and register compare the unchanged residual score against current organisation tolerance and show a framework-change exception. Formal Review offers:

- keep the historical position;
- explicitly apply the current framework; or
- for an authorised organisation manager, apply an override with rationale.

The review preserves both inherited and applied values. A new framework can change the exception position but never changes the Risk score.

## 9. Override governance

Only a user with `ORGANISATION_MANAGE` may select an override. The API repeats this permission check and requires a meaningful rationale. The Risk and RiskReview preserve framework version, original inherited appetite/tolerance, override appetite/tolerance, rationale, actual actor and time. `ActivityLog` also records the review decision and provenance.

## 10. Closure authority

Authority is provider-configurable by Risk level and optional category. The form offers editable provider suggestions, explicitly labelled as configuration rather than regulatory rules.

- Low can be configured for proportionate authorised self-approval.
- Moderate defaults to proposal plus a separate authorised governance decision; a provider can permit self-approval where genuinely required.
- High defaults to no self-approval, current verified Evidence and effectiveness Evidence.
- Critical defaults to no self-approval, enhanced authority, current verified Evidence, effectiveness Evidence and two approvals.

If no effective policy exists, a documented proportional legacy fallback keeps existing tenants operable with the same stronger-risk/stronger-assurance pattern.

## 11. Critical approval model

Critical dual approval is implemented through `RiskClosureApproval`, not extra Risk user columns. Each actual signed-in approver can decide only once per proposal. The server counts distinct append-only approvals in a serializable transaction. Role, membership, policy and authority wording are snapshotted. The final approval closes the Risk only when the current rule's approval count and all assurance conditions are satisfied.

## 12. Server enforcement

General Risk creation/edit rejects `CLOSED` and `CLOSURE_PROPOSED`; a Risk in the closure workflow cannot be modified by that route. Archive/restore cannot be used to hide a closed or pending-closure Risk. Formal Review cannot mutate a closed/pending Risk. The dedicated closure endpoint re-resolves tenant/location scope, current role, current effective policy, current framework tolerance, Evidence assurance, unresolved Actions and effectiveness at request time. It never accepts an approver ID from the client. If policy changes after proposal, approval is blocked and re-proposal under current policy is required.

## 13. Management Assurance Test

`evaluateRiskClosure` and `evaluateRiskClosureConditions` are shared by the Risk detail UI and the closure API. The checks remain named reasons, not a misleading percentage: role, separation, within tolerance, Actions resolved, sufficient Evidence, verified Evidence where configured, effectiveness where configured, and required approval count. The UI guides; the server authorises.

## 14. Framework-change exceptions

The existing Risk Register—not a duplicate dashboard—counts and labels open Risks that are above the current framework tolerance because the framework threshold changed. Risk detail shows the newer framework and prompts deliberate adoption at formal review. Scores and historical snapshots are never rewritten and no Actions are created automatically.

## 15. UX

The RM selects a category and QCGMS supplies the current governed appetite/tolerance. Policy management uses current version, history, collapsed rule details and a collapsed “Draft new version” area. Closure is a clear propose/approve/reject/withdraw path rather than a status dropdown or an “approved by” selector.

Remaining friction: framework drafts are deliberately immutable after creation; an error requires withdrawing and recreating the draft. The draft authority form remains detailed because it controls consequential provider rules, although progressive disclosure keeps it out of ordinary RM workflows. Closure rationale currently uses a browser prompt and should become a richer accessible review dialog after the data model is proven in pilot use.

## 16. Testing

- Unit: exact category mapping, safe custom-category failure, default/category inheritance, no score mutation, framework validation, override permission/rationale, direct general-route closure guard, Low/High/Critical authority, unresolved Actions, verified Evidence, effectiveness and approval counts.
- Full automated suite: 66 files and 316 tests passed.
- Prisma schema validation: passed.
- TypeScript: passed.
- ESLint: passed.
- Production `vinext` build: passed; only pre-existing Vite config warnings and the existing runtime policy-logo URL warning were emitted.
- E2E: the authenticated Risk lifecycle scenario was updated for active-framework inheritance, direct API closure rejection and propose/approve closure. Playwright discovery compiled all 16 desktop/mobile scenarios. The new migration was not applied to the configured remote database, so stateful E2E execution was deliberately not run against it.
- Mobile: the mobile project discovers the updated lifecycle scenario, but live mobile browser execution remains outstanding for the same isolated-database reason.
- Migration: schema/migration SQL and database invariants were statically validated. A disposable local PostgreSQL service was not available, so migration deploy/rollback was not executed locally.

## 17. Technical debt

The previously observed Playwright/OneDrive development-server teardown issue remains. It does not affect unit/build results. E2E setup/teardown now removes closure proposals/approvals safely, but the full browser run still needs an isolated migrated PostgreSQL database. The source also retains some dense legacy JSX; this slice avoided unrelated refactoring.

## 18. Governance relationship compatibility

The design follows the agreed hybrid architecture. Lifecycle-driving Risk → proposal → Evidence/approval and framework/policy dependencies use dedicated foreign keys and joins. Existing Risk → canonical Action and Risk → canonical Evidence relationships remain reused. No loose generic string-ID relationship layer was introduced.

## 19. What was deliberately NOT built

- no fuzzy migration or rewrite of historical categories/Risks;
- no guided likelihood/impact scoring;
- no automatic Action creation after framework change;
- no automatic residual-score or target-score change;
- no broad GovernanceRelationship table;
- no Evidence Taxonomy or Provider Control Catalogue;
- no individual-user hard-coding in policy;
- no silent approval or approval on another person's behalf;
- no retrospective policy application; and
- no deployment/publish or live database migration in this slice.

## 20. Recommended next phase

Before Evidence Taxonomy and Provider Control Catalogue, complete one release gate: deploy the additive migration to a disposable/staging PostgreSQL database, seed two distinct authorised approvers, run the full desktop Critical dual-approval E2E plus the targeted mobile surfaces, and pilot the closure review dialog. Once that passes, proceed with **Evidence Taxonomy + Provider Control Catalogue**. Those capabilities now have the Risk/provenance/authority foundation they need and should remain the next architectural product slice.
