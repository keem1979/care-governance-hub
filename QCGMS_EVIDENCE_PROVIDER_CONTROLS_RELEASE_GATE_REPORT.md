# QCGMS Evidence & Provider Controls Release-Gate Report

## 1. Release decision

# RELEASE GATE: PASS

The Evidence Taxonomy and Provider Control slice passed the stated minimum release gate in an isolated environment. The gate proves additive migration safety, truthful legacy retention, authenticated Provider Control and Medicines Risk workflows, role-aware Evidence, supersession/retirement behaviour, scoped permissions, mobile usability, static validation and production compilation. Passing this engineering gate does not authorise production deployment.

## 2. Environment

Testing used a disposable local PostgreSQL 17 cluster on `127.0.0.1:55434`, with separate databases `qcgms_controls_fresh` and `qcgms_controls_upgrade`. Browser tests used the application’s real Next.js development runtime, test-only MFA identities and the guarded non-production E2E setup route. No production database, Cloudflare Worker or live tenant was used.

## 3. Migration

Fresh validation applied the complete 58-migration history from zero, including `20260821133000_evidence_taxonomy_provider_controls`. Verification confirmed the new Evidence fields, provider extensions, role-aware relationships, Provider Controls and versions, location scopes, Risk applications, Control Evidence, append-only effectiveness reviews, permissions, indexes and constraints.

Upgrade validation applied the 57 pre-slice migrations, loaded a fictional pre-slice fixture, then applied the new migration. The preservation verifier returned `UPGRADE PRESERVATION PASS` for all five legacy Evidence records and their governed relationships.

## 4. Legacy Evidence preservation

The upgrade fixture retained exact historical `category` and `evidenceType` strings, including:

- Audits / Audit assurance record
- Audits / Record
- Health and safety / Risk assurance record
- Policies / Policy record
- Quality improvement / Record
- Training / Record

Structured taxonomy keys remained null (`safely_unclassified`) where no authorised classification occurred. Risk/Action Evidence joins, versions, verification decisions, source references and legacy relationship roles remained intact. No fuzzy mapping or fabricated provenance was introduced.

## 5. Draft Provider Control UX

The Provider Control page now includes a progressive Draft editor for title, description, family, Risk categories, organisation/location scope, accountable Control owner, expected Evidence family/type, expected effectiveness method, effective/review dates and change rationale. The screen explicitly states that a Draft is not an approved operating Control. Only Draft versions can be edited; activation is a deliberate governed event and effective versions remain immutable.

Provider Evidence extensions can now also be deliberately retired from the management screen. Retirement is audited and does not delete historical use.

## 6. Evidence search/pagination

The Evidence Library now performs server-side text search, filtering, counts and pagination at 24 records per page. Filters cover Core family, Evidence type, Provider subtype, location, currentness, verification and provenance/source type. The browser does not load the whole table.

The Risk page presents a small contextual suggestion set first, followed by a separate server-side Evidence search endpoint capped at 20 authorised results. Search and linking re-check tenant, Risk scope and Evidence location scope on the server.

## 7. Medicines Risk E2E

The authenticated gate passed this flow:

Provider Control Draft → edit Draft → activate v1 → open Medicines Risk → keep QCGMS suggestions visibly separate → deliberately apply Provider Control → retain the v1 snapshot → suggest/search authorised Medication Audit Evidence → link Control Evidence → observe effectiveness remains Not Tested → link Effectiveness Evidence → record professional effectiveness review → create/edit/activate v2 → keep the Risk on v1 and mark review required → retire v2 → retain history → create and retire a provider Evidence extension → enforce Viewer, location and cross-tenant boundaries.

The specialist browser scenario passed: `1 passed`.

## 8. Control Evidence roles

One canonical Evidence record was linked to the applied Control in both `CONTROL` and `EFFECTIVENESS` roles. The Evidence row was not duplicated, neither relationship overwrote the other, and the role is stored on the relationship. Existing legacy Risk relationships remain `LEGACY_UNSPECIFIED` rather than being reinterpreted.

Evidence provenance remains on the canonical Evidence record. Evidence role remains contextual to the governance relationship.

## 9. Control effectiveness

Linking Evidence does not create an effectiveness judgement. Effectiveness is an append-only professional review with method, outcome, rationale, actual reviewer, review date and optional next review. Earlier reviews are not overwritten.

The separate three-person Critical Risk lifecycle passed and proved:

- completing the central Action did not change residual Risk 6 or claim target Risk 2 was achieved;
- completing the Action created an “effectiveness awaiting review” exception;
- effectiveness was assessed later on the Action;
- only a formal Risk review changed current residual Risk;
- Critical closure rejected self-approval and required two authorised decisions;
- the complete audit trail remained visible.

## 10. Supersession

Activating Provider Control v2 superseded v1. The open Risk retained v1, its snapshot, Evidence relationships and effectiveness history. Its application changed to `REVIEW_REQUIRED`; v2 was not silently substituted and the Risk score was not changed.

## 11. Retirement

Retiring the effective Control removed it from ordinary new application while preserving the historical application, linked Evidence and effectiveness review. The active Risk retained a review-required assurance signal. Provider Evidence extension retirement was also exercised through the authenticated UI/API and returned 200 without destructive deletion.

## 12. Evidence currentness

The shared evaluator passed tests for:

- historical non-expiring Evidence remaining valid as history regardless of age;
- expiry-based Evidence becoming expired when its expiry date passes;
- review-based and current-source Evidence becoming review due;
- supersession-based Evidence retaining history but not current authority;
- legacy null-mode Evidence preserving backward-compatible expiry handling;
- verification/rejection/archive states remaining separate from taxonomy classification.

These are contextual assurance states, not a blanket judgement that old Evidence is bad Evidence.

## 13. Assurance gaps/conflicts

Deterministic tests cover missing Control Evidence, expected family/type mismatch, currentness/verification warnings, effectiveness not tested, insufficient Evidence and superseded/retired/review-required Control applications. A factual potential assurance conflict appears when an `EFFECTIVE` judgement lacks Effectiveness Evidence or relies on Evidence with an unresolved assurance state. No Risk score, clinical decision or regulatory conclusion is changed automatically.

## 14. Permissions/security

`controls:manage` is a capability permission combined with tenant, membership, role and location authority; it is not unrestricted organisation scope. The authenticated release scenario confirmed:

- authorised owners/managers can manage permitted Controls;
- a normal governance editor can apply an approved Control to an authorised Risk but cannot redefine the library;
- a Viewer cannot mutate Controls or use the governed Evidence search;
- a location-scoped manager cannot create organisation-wide Controls or target another location;
- a different tenant cannot open or link the Risk;
- the server uses the signed-in actor for approval, editing, application and review history.

The dedicated closure-security scenario also passed during this gate. A later confirmation rerun was manually stopped because the Windows Next.js test process failed to exit cleanly; it produced no contrary assertion result and is not counted as an additional pass.

## 15. Performance

A reproducible fixture populated 5,000 fictional Evidence rows. Representative tenant/family/type/text search executed in approximately 5.1 ms; a deep 24-row page executed in approximately 8.1 ms on the disposable database. Searches use server-side filtering/pagination and do not transfer the whole Evidence table. At this modest volume PostgreSQL selected sequential scans; existing composite indexes provide the intended scale path, but production-like cardinality should be profiled before very large rollout.

No N+1 issue was found in the new Evidence Library or Risk search endpoint. A separate legacy Risk source-record selector remains capped and should eventually use its own server search.

## 16. Mobile

Two targeted mobile Chromium scenarios passed. They covered the RM-critical Risk/Framework journey and the Evidence Library, Evidence search disclosure, Risk Control search and Provider Control Library. The global `details > summary` rule was corrected to a 44 px minimum touch target. The tested surfaces had no horizontal overflow at the iPhone 13 viewport.

Longer content is allowed to wrap. The new extension retirement button also has a 44 px minimum height.

## 17. Automated tests

- Prisma schema validation: passed.
- TypeScript: passed.
- ESLint: passed.
- Vitest: 67 files, 330 tests passed.
- Fresh migration verifier: passed.
- Upgrade migration verifier: passed.
- Authenticated Evidence/Control release scenario: passed.
- Authenticated Critical Risk lifecycle: passed (`1 passed`, four-minute run including Windows teardown).
- Targeted mobile suite: 2 passed.
- Production `vinext` build: passed after final source changes.

The build retains existing non-fatal warnings about future Vite native config loading and the runtime branding-logo route.

## 18. Technical debt

- On Windows, Playwright sometimes completes the scenario but hangs while terminating the Next.js development process. Exact test-owned child processes had to be stopped before Playwright emitted its successful final result. This is test infrastructure debt, not a production authentication bypass.
- Standalone `npm run db:seed` encountered a known Prisma WASM runtime initialisation problem; the guarded real-runtime E2E setup route worked and was used instead.
- Relationship removal currently relies on ActivityLog for event history; historical Provider Control applications/effectiveness are preserved, but a future relationship-retirement model may be preferable where a link directly supported a signed decision.
- Provider extension duplicate labels receive organisation-scoped stable-key suffixes. This is safe and unique, but the UX should later warn about a similar existing label before creating another.
- Person/staff-specific Evidence ranking still lacks reliable canonical relationships.

## 19. What was deliberately not built

No AI classification, automatic Control application, automatic effectiveness judgement, automatic Risk reassessment, automatic Control replacement, broad polymorphic relationship table, incident-recurrence string matching, person/staff name matching, large taxonomy catalogue, Assurance percentage or production deployment was introduced.

Repeated `Other — specify` values are structurally available for future aggregate insight, but no automatic taxonomy/Control creation was added.

## 20. Repository/deployment state

The working tree contains the Evidence/Provider Control implementation, migration, release-gate SQL, browser tests and reports as uncommitted changes on `phase-11-validated-launch`.

- Committed: No.
- Pushed: No.
- Deployed/published: No.
- Production data changed: No.

## 21. Recommended Action Evidence rollout

The next safe slice is role-aware Evidence for the existing central Follow-Up Action model. First inspect the current `ActionEvidence`, verification, effectiveness and closure queries; then add relationship roles only where they clarify Source, Completion, Verification, Effectiveness and Closure Evidence without creating a second Action lifecycle. Requirements should remain proportionate to Action severity/source. Audits should follow only after the Action slice passes its own gate.

## 22. Architecture concerns

Nothing found changes the controlled-hybrid roadmap. Critical lifecycle relationships should continue using dedicated, referentially safe joins; broader traceability can later use a typed relationship layer with strict tenant/location validation. Person/staff Evidence ranking and incident recurrence should wait for that architecture.

Before the Action rollout, address the Windows E2E teardown reliability and decide whether governed relationship retirement needs more than ActivityLog. Do not start Material Change yet.

# RELEASE GATE: PASS
