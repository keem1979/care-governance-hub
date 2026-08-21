# QCGMS Evidence Taxonomy & Provider Control Library Report

## 1. Existing architecture inspected

QCGMS already had one canonical `Evidence` record with source/provenance fields, private file versions, a current-version pointer, named verification decisions, review/expiry dates and module-specific join tables. Risk held free-text controls, a simple control-effectiveness position and code-level contextual suggestions. Actions already had separate verification and effectiveness records. These foundations were reused; no second Evidence or Action subsystem was created.

## 2. Existing Evidence values

The read-only inventory found these stored combinations: Audits/Audit assurance record (1), Audits/Record (1), Health and safety/Risk assurance record (9), Policies/Policy record (6), Quality improvement/Record (8), and Training/Record (1). Source provenance included Risk/internal record (9), Action/internal record (8), Policy/internal record (6), Audit/internal record (1), E2E fixture/uploaded document (1), and Workforce Training Matrix/system generated (1).

`Record` is semantically broad and appears under multiple categories; Audits has both `Record` and `Audit assurance record`. Those are not safely equivalent. Existing strings may also support exports and historical screens. No fuzzy mapping or historical rewrite was performed.

## 3. Final Evidence taxonomy

The deterministic core catalogue has 15 stable families: Care & Clinical; Risk & Safety; Medicines; Safeguarding; Workforce; Quality & Audit; Person/Representative Feedback; Professional/External; Equipment & Environment; Governance & Management; Regulatory & Commissioner; Information Governance & Cyber; Business Continuity; Policy & Procedure; Other.

Each family contains contextual types with a default currentness capability. A provider may add an optional subtype beneath a core family. Providers cannot create competing top-level families.

## 4. Migration strategy

The migration is additive. Existing `category` and `evidenceType` strings remain unchanged. New structured taxonomy fields are nullable, so legacy records retain null structured provenance until an authorised user accurately classifies them. The edit screen labels these records as legacy and permits preservation. New uploads store both stable keys and human-readable snapshots while retaining legacy display strings for backwards-compatible reports.

## 5. Evidence provenance

Existing provenance remains on the Evidence record: source type, source name, source reference, source URL, original author, captured date and provenance note. Provenance answers where the record came from; it is not reused as the role the Evidence plays in a Risk.

## 6. Evidence roles

`EvidenceRole` now belongs to the Risk relationship. The same Evidence ID can be linked as Control and Effectiveness Evidence without duplicating the Evidence record. Existing Risk links migrate truthfully to `LEGACY_UNSPECIFIED`; new general Risk links use `SUPPORTING`. Control-application links permit `CONTROL` and `EFFECTIVENESS`. General Risk editing preserves these governed role links rather than deleting them.

## 7. Evidence currentness

Currentness is type-aware: historical non-expiring, expiry based, review based, supersession based, and current-source modes. Evidence can be Current, Superseded or Historical. The assurance evaluator distinguishes Expired, Review Due, Superseded, Historical, stale verification, rejected, unverified and archived states. A historical incident does not expire merely because it is old; a superseded Policy does not remain current authority.

## 8. Provider Control architecture

The minimum governed model is a canonical `ProviderControl` with immutable `ProviderControlVersion` records, optional selected-location scope, accountable Control owner, applicable Risk categories, expected Evidence families/types, expected effectiveness method, effective/review dates, approval actor and change rationale. Drafts can be edited; effective versions require a new version for change.

## 9. QCGMS Core vs Provider Controls

Code-level QCGMS suggestions remain visibly labelled “Suggested QCGMS Controls” and advisory. They are never attached automatically. Only approved Provider Controls appear under “Provider Controls likely relevant”, and the RM must deliberately confirm that one applies to the Risk.

## 10. Control application

`RiskControlApplication` links one Risk to one approved Control version. The server checks tenant, authorised Risk scope, Control location scope, effective status and Risk category. Applying a Control captures stable key, version, title, description, family, expected Evidence and effectiveness method snapshots plus the actual signed-in actor.

## 11. Control versioning

Historical Risk applications retain their original Control version and snapshots. Activating a replacement supersedes the prior version and marks affected active applications `REVIEW_REQUIRED`. Retiring a Control does the same. No Risk is silently rewritten or moved to the replacement version.

## 12. Control Evidence

`RiskControlEvidence` answers which Evidence supports which applied Control and in which role. Linking also maintains a role-aware Risk/Evidence relationship for Risk-wide history and closure review. Scope checks prevent linking Evidence from another tenant or unauthorised location.

## 13. Effectiveness

`RiskControlEffectivenessReview` is append-only professional judgement with method, rationale, review date, optional next-review date and actual reviewer. Outcomes reuse the existing effectiveness vocabulary—Effective, Partially Effective and Ineffective—with `Insufficient Evidence` added. Absence of a review is displayed as Not Tested. Merely linking Evidence does not create an effectiveness review.

## 14. Assurance gaps/conflicts

Calculated gaps include missing Control Evidence, Evidence currentness/verification issues, effectiveness not tested, insufficient Evidence, and a retired/superseded/review-required Control application. Deterministic conflicts include an Effective judgement without Effectiveness Evidence and an Effective judgement supported by Evidence with an unresolved assurance state. These feed the existing Management Assurance Test as reasons, not a percentage or automatic decision.

## 15. UX

Risk detail now keeps the common workflow in one progressive-disclosure panel: view applied Provider Controls, confirm a relevant approved Control, review a limited Suggested Evidence list, link an existing record, and separately record effectiveness. QCGMS suggestions and Provider Controls are visually and semantically separated. Evidence upload uses Core Family → Contextual Type → optional Provider subtype. This replaces repeated naming while retaining professional narrative for rationale.

## 16. Permissions

A new `controls:manage` permission is assigned to Organisation Owner, Registered Manager and Quality/Compliance Manager role presets. Organisation-wide Control creation requires all-location authority. A location-scoped manager may only manage selected-location Controls entirely inside their authorised locations. Users with normal governance edit permission may apply approved Controls to authorised Risks but cannot redefine the Provider Control Library. All mutation routes re-check organisation and location scope server-side.

## 17. Performance

Indexes cover tenant plus taxonomy keys, provider subtype, Control status/family, category arrays, application status/version, Evidence role and effectiveness review dates. Risk’s legacy selector was reduced from 300 to 40. Risk detail retrieves at most 40 authorised Evidence candidates, ranks deterministic taxonomy/category and same-location matches, and displays at most 12. Provider Control candidates are capped at 50. The Evidence Library default query is capped at 100 pending full pagination/search work.

## 18. Schema/migrations

Migration: `20260821133000_evidence_taxonomy_provider_controls`.

Added: structured Evidence taxonomy/currentness fields; provider Evidence extensions; relationship Evidence roles; canonical/versioned Provider Controls; location scopes; Risk Control applications; Control Evidence relationships; append-only Control effectiveness reviews; relevant indexes, foreign keys and `controls:manage` permission seeding. `EffectivenessOutcome` gains `INSUFFICIENT_EVIDENCE`.

## 19. Testing

Passed: Prisma schema validation; Prisma client generation; TypeScript; ESLint; `git diff --check`; full Vitest suite (67 files, 326 tests); targeted taxonomy/currentness/scope/assurance suite (9 tests); production vinext build and route generation.

The new unit tests cover family/type resolution, contextual suggestions, unknown legacy handling, historical non-expiry, expiry, review-due, supersession, location authority, Control applicability, completion/effectiveness separation and deterministic conflict detection.

An isolated PostgreSQL cluster was initialised locally, but the sandbox could not start the PostgreSQL process because elevated execution was unavailable. No migration or E2E request was run against production. Consequently the additive SQL migration and authenticated browser lifecycle remain release-gate items; they are not falsely reported as passed.

## 20. What was deliberately NOT built

No AI classification, automatic Control adoption, automatic effectiveness decision, Risk-score change, automatic replacement of applied Controls, cross-module refactor, broad Governance Relationship table, 300-item taxonomy, Assurance Gap database lifecycle, notification flood or production deployment was introduced. No historical Evidence value was remapped.

## 21. Cross-module rollout recommendation

After the Risk release gate, extend relationship-level roles to central Follow-Up Actions next. Actions already have verification and effectiveness lifecycles, so adding Completion/Verification/Effectiveness Evidence roles will strengthen the chain with less schema risk than immediately refactoring Safeguarding or Care Plans. Audits should follow because findings already generate Actions.

## 22. Governance Relationship compatibility

The implementation follows the controlled hybrid direction: dedicated joins for critical lifecycle relationships (`RiskControlApplication`, `RiskControlEvidence`) and stable IDs/snapshots that can later participate in typed secondary traceability. It does not introduce unvalidated polymorphic string links.

## 23. Practical limitations

Provider extensions intentionally have lightweight active/retired governance rather than a heavyweight approval lifecycle. Draft Provider Control edit is enforced by API, but the management screen still needs a polished inline Draft editor before release. Evidence Library pagination and richer family/type/currentness filters remain incomplete. Person/staff-specific Evidence ranking is not available because the canonical Evidence model does not yet carry those relationships consistently. Incident recurrence conflicts need the future controlled relationship layer; implementing them now would require unreliable string matching.

The disposable local cluster directory remains at `C:\Users\juuka\AppData\Local\Temp\qcgms-evidence-controls-pg-20260821` because the same sandbox approval limit also blocked cleanup. It contains only a newly initialised, non-running empty PostgreSQL cluster and no QCGMS or production data.

## 24. Recommended next phase

Do not roll this across modules yet. First complete the release gate on a disposable/staging PostgreSQL database: apply all migrations, verify legacy Evidence rows remain unchanged/null-classified, exercise two roles and two locations, and run the authenticated Medicines Risk journey including Control supersession/retirement. During that gate, finish the inline Draft editor and Evidence search pagination. If those pass, extend role-aware Evidence to Actions, then Audits. This is safer and more valuable than beginning Material Change or a broad relationship layer now.

No code was committed, pushed or published in this phase, and production data was not changed.
